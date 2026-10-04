// One-off/idempotent loader for backend/data_files/outlets.csv into Depot + Outlet.
// Run with: npm run db:seed:outlets
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { getPrisma, disconnectDatabase } from "../src/config/database.js";
import { Brand, UnloadingType } from "../src/generated/prisma/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, "../data_files/outlets.csv");

// CSV "depot" column -> canonical Depot.code/name (schema example: PLY, KDY)
const DEPOT_DEFINITIONS = {
    Peliyagoda: { code: "PLY", name: "Peliyagoda Distribution Centre" },
    Kandy: { code: "KDY", name: "Kandy Regional Hub" },
};

const BRAND_BY_CSV_VALUE = { Fresh: Brand.FRESH, Style: Brand.STYLE, Tech: Brand.TECH };

const UNLOADING_TYPE_BY_DOCK_TYPE = {
    street: UnloadingType.CURB,
    rear_dock: UnloadingType.REAR_DOCK,
    mall_bay: UnloadingType.MALL_BAY,
};

// "HH:MM" -> minutes since midnight (outlet window fields store minutes, not times)
const toMinutesSinceMidnight = (time) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

const parseCsv = (raw) => {
    const [headerLine, ...lines] = raw.trim().split(/\r?\n/);
    const headers = headerLine.split(",");
    return lines.filter(Boolean).map((line) => {
        const values = line.split(",");
        return headers.reduce((row, header, index) => {
            row[header] = (values[index] ?? "").trim();
            return row;
        }, {});
    });
};

const run = async () => {
    const db = getPrisma();
    const rows = parseCsv(readFileSync(CSV_PATH, "utf-8"));

    // Upsert the two depots referenced by the CSV before any outlet needs them.
    const depotIdByCsvName = {};
    for (const [csvName, { code, name }] of Object.entries(DEPOT_DEFINITIONS)) {
        const depot = await db.depot.upsert({
            where: { code },
            update: { name },
            create: { code, name },
        });
        depotIdByCsvName[csvName] = depot.id;
    }

    for (const row of rows) {
        const depotId = depotIdByCsvName[row.depot];
        if (!depotId) {
            throw new Error(`outlets.csv: unknown depot "${row.depot}" for outlet ${row.outlet_id}`);
        }

        const brand = BRAND_BY_CSV_VALUE[row.brand];
        if (!brand) {
            throw new Error(`outlets.csv: unknown brand "${row.brand}" for outlet ${row.outlet_id}`);
        }

        const [mallAccessStartTime, mallAccessEndTime] = row.mall_window
            ? row.mall_window.split("-")
            : [null, null];

        const data = {
            name: `${row.outlet_id} - ${row.district} (${row.brand})`,
            brand,
            district: row.district,
            depotId,
            vanOnly: row.parking_constraint === "van_only",
            isMall: row.parking_constraint === "mall_dock",
            windowStartMin: toMinutesSinceMidnight(row.window_open_time),
            windowEndMin: toMinutesSinceMidnight(row.window_close_time),
            mallAccessStartMin: toMinutesSinceMidnight(mallAccessStartTime),
            mallAccessEndMin: toMinutesSinceMidnight(mallAccessEndTime),
            unloadingType: UNLOADING_TYPE_BY_DOCK_TYPE[row.dock_type] ?? null,
            // raw CSV columns not covered by typed fields, kept verbatim
            sourceAttributes: {
                depotName: row.depot,
                dockType: row.dock_type,
                parkingConstraint: row.parking_constraint,
                mallWindow: row.mall_window || null,
            },
        };

        await db.outlet.upsert({
            where: { code: row.outlet_id },
            update: data,
            create: { code: row.outlet_id, ...data },
        });
    }

    console.log(
        `Seeded ${rows.length} outlets across ${Object.keys(depotIdByCsvName).length} depots from outlets.csv.`,
    );
};

run()
    .catch((error) => {
        console.error("Failed to seed outlets:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await disconnectDatabase();
    });
