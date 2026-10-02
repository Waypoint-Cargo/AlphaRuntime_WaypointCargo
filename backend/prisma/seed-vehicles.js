// One-off/idempotent loader for backend/data_files/vehicles.csv into Depot + Vehicle.
// Run with: npm run db:seed:vehicles
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { getPrisma, disconnectDatabase } from "../src/config/database.js";
import { VehicleType } from "../src/generated/prisma/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, "../data_files/vehicles.csv");

// CSV "depot" column -> canonical Depot.code/name (same mapping used by seed-outlets.js)
const DEPOT_DEFINITIONS = {
    Peliyagoda: { code: "PLY", name: "Peliyagoda Distribution Centre" },
    Kandy: { code: "KDY", name: "Kandy Regional Hub" },
};

// CSV "type" + "temp" -> VehicleType (vans stay a single type regardless of temp;
// trucks split into REFRIGERATED_TRUCK / DRY_BOX_TRUCK based on temp)
const toVehicleType = (type, temp) => {
    if (type === "van") return VehicleType.VAN;
    return temp === "reefer" ? VehicleType.REFRIGERATED_TRUCK : VehicleType.DRY_BOX_TRUCK;
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

    // Upsert the two depots referenced by the CSV before any vehicle needs them.
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
        const homeDepotId = depotIdByCsvName[row.depot];
        if (!homeDepotId) {
            throw new Error(`vehicles.csv: unknown depot "${row.depot}" for vehicle ${row.vehicle_id}`);
        }

        const isRefrigerated = row.temp === "reefer";

        const data = {
            type: toVehicleType(row.type, row.temp),
            isRefrigerated,
            maxWeightKg: Number(row.weight_cap_kg),
            maxVolumeM3: Number(row.volume_cap_m3),
            fuelKmPerLitre: Number(row.km_per_l),
            weeklyFuelQuotaL: Number(row.weekly_fuel_quota_l),
            homeDepotId,
            // raw CSV columns not covered by typed fields, kept verbatim
            sourceAttributes: {
                fuelType: row.fuel_type,
                depotName: row.depot,
            },
        };

        await db.vehicle.upsert({
            where: { code: row.vehicle_id },
            update: data,
            create: { code: row.vehicle_id, ...data },
        });
    }

    console.log(
        `Seeded ${rows.length} vehicles across ${Object.keys(depotIdByCsvName).length} depots from vehicles.csv.`,
    );
};

run()
    .catch((error) => {
        console.error("Failed to seed vehicles:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await disconnectDatabase();
    });
