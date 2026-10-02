// Reference data from backend/data_files: depots, outlets, vehicles and the operating calendar.
// Called by prisma/seed.js (npm run db:seed). Idempotent: rows that already exist are left untouched,
// so manual changes (an outlet deactivated by an admin, ...) survive a re-run.
//
// Nothing is invented: every value comes from the CSV files. The only generated rows are calendar
// days after the end of calendar.csv (Mon-Sat operating, Sunday closed), each marked
// sourceAttributes.generated = true so they can be replaced by real data later.

import { readFileSync } from "node:fs";
import { logger } from "../src/config/logger.js";

const DATA_DIR = new URL("../data_files/", import.meta.url);
const CALENDAR_GENERATED_UNTIL = "2027-12-31";

const EXPECTED = { depots: 2, outlets: 120, vehicles: 60 };

// depot names as they appear in the CSV files -> depot rows
const DEPOTS = {
    Peliyagoda: { code: "PLY", name: "Peliyagoda Distribution Centre" },
    Kandy: { code: "KDY", name: "Kandy Regional Hub" },
};

const BRANDS = { Fresh: "FRESH", Style: "STYLE", Tech: "TECH" };
const UNLOADING = { rear_dock: "REAR_DOCK", street: "CURB", mall_bay: "MALL_BAY" };

const readCsv = (file) => {
    const text = readFileSync(new URL(file, DATA_DIR), "utf8").replace(/^﻿/, "");
    const [head, ...lines] = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    const columns = head.split(",").map((column) => column.trim());
    return lines.map((line, index) => {
        const cells = line.split(",");
        if (cells.length !== columns.length) {
            throw new Error(`${file} line ${index + 2}: expected ${columns.length} columns, found ${cells.length}`);
        }
        return Object.fromEntries(columns.map((column, i) => [column, cells[i].trim()]));
    });
};

const pick = (map, key, what, where) => {
    if (!Object.hasOwn(map, key)) throw new Error(`${where}: unknown ${what} '${key}'`);
    return map[key];
};

const toMinutes = (text, where) => {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(text);
    if (!match) throw new Error(`${where}: '${text}' is not HH:MM`);
    return Number(match[1]) * 60 + Number(match[2]);
};

const toNumber = (text, where) => {
    const value = Number(text);
    if (text === "" || Number.isNaN(value)) throw new Error(`${where}: '${text}' is not a number`);
    return value;
};

const utcDate = (ymd) => new Date(`${ymd}T00:00:00Z`);

// ---- ISO week (for generated calendar days) ----
const isoWeekParts = (date) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this ISO week
    const isoYear = d.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return { isoYear, week };
};

const DOW_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---- builders ----

const buildCalendar = () => {
    const rows = readCsv("calendar.csv").map((row) => ({
        date: utcDate(row.date),
        isOperatingDay: row.is_operating === "1",
        isWeekend: row.is_weekend === "1",
        isPayday: row.is_payday === "1",
        festivalName: row.festival === "" ? null : row.festival,
        isMonsoon: row.monsoon === "1",
        sourceAttributes: {
            dow: toNumber(row.dow, `calendar ${row.date} dow`),
            dow_name: row.dow_name,
            iso_year: toNumber(row.iso_year, `calendar ${row.date} iso_year`),
            iso_week: toNumber(row.iso_week, `calendar ${row.date} iso_week`),
            festival_ramp: toNumber(row.festival_ramp, `calendar ${row.date} festival_ramp`),
            is_holiday: row.is_holiday === "1",
        },
    }));

    // days after the file ends: Mon-Sat operate, Sunday is closed; holidays/festivals unknown
    const last = rows.reduce((max, row) => (row.date > max ? row.date : max), rows[0].date);
    const end = utcDate(CALENDAR_GENERATED_UNTIL);
    let generated = 0;
    for (let d = new Date(last.getTime() + 86400000); d <= end; d = new Date(d.getTime() + 86400000)) {
        const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
        const { isoYear, week } = isoWeekParts(d);
        rows.push({
            date: d,
            isOperatingDay: dow !== 6,
            isWeekend: dow === 6,
            isPayday: false,
            festivalName: null,
            isMonsoon: false,
            sourceAttributes: { generated: true, dow, dow_name: DOW_NAMES[dow], iso_year: isoYear, iso_week: week },
        });
        generated++;
    }
    return { rows, generated };
};

const buildOutlets = (depotIdByName) => {
    const travel = new Map(readCsv("district_travel.csv").map((row) => [`${row.depot}|${row.district}`, row]));
    const allowance = new Map(readCsv("service_allowance.csv").map((row) => [`${row.brand}|${row.dock_type}`, row]));

    return readCsv("outlets.csv").map((row) => {
        const where = `outlets.csv ${row.outlet_id}`;
        const brand = pick(BRANDS, row.brand, "brand", where);
        const unloadingType = pick(UNLOADING, row.dock_type, "dock_type", where);
        const depotId = pick(depotIdByName, row.depot, "depot", where);
        const trip = travel.get(`${row.depot}|${row.district}`);
        if (!trip) throw new Error(`${where}: no district_travel.csv row for ${row.depot} / ${row.district}`);
        const service = allowance.get(`${row.brand}|${row.dock_type}`);
        if (!service) throw new Error(`${where}: no service_allowance.csv row for ${row.brand} / ${row.dock_type}`);
        if (!["van_only", "normal", "mall_dock"].includes(row.parking_constraint)) {
            throw new Error(`${where}: unknown parking_constraint '${row.parking_constraint}'`);
        }

        const windowStartMin = toMinutes(row.window_open_time, `${where} window_open_time`);
        const windowEndMin = toMinutes(row.window_close_time, `${where} window_close_time`);
        if (windowEndMin <= windowStartMin) throw new Error(`${where}: window closes before it opens`);

        const isMall = row.dock_type === "mall_bay";
        let mallAccessStartMin = null;
        let mallAccessEndMin = null;
        if (row.mall_window !== "") {
            const [from, to] = row.mall_window.split("-");
            mallAccessStartMin = toMinutes(from, `${where} mall_window`);
            mallAccessEndMin = toMinutes(to, `${where} mall_window`);
        }
        if (isMall !== (row.mall_window !== "")) throw new Error(`${where}: mall_bay and mall_window disagree`);

        return {
            code: row.outlet_id,
            name: row.outlet_id, // the files carry no outlet names
            brand,
            district: row.district,
            depotId,
            vanOnly: row.parking_constraint === "van_only",
            isMall,
            windowStartMin,
            windowEndMin,
            mallAccessStartMin,
            mallAccessEndMin,
            unloadingType,
            sourceAttributes: {
                dock_type: row.dock_type,
                parking_constraint: row.parking_constraint,
                mall_window: row.mall_window === "" ? null : row.mall_window,
                road_class: trip.road_class,
                free_flow_kmh: toNumber(trip.free_flow_kmh, `${where} free_flow_kmh`),
                depot_to_district_km: toNumber(trip.depot_to_district_km, `${where} depot_to_district_km`),
                depot_to_district_freeflow_min: toNumber(trip.depot_to_district_freeflow_min, `${where} depot_to_district_freeflow_min`),
                inter_stop_km: toNumber(trip.inter_stop_km, `${where} inter_stop_km`),
                inter_stop_freeflow_min: toNumber(trip.inter_stop_freeflow_min, `${where} inter_stop_freeflow_min`),
                service_allowance_min: toNumber(service.service_allowance_min, `${where} service_allowance_min`),
            },
        };
    });
};

const buildVehicles = (depotIdByName) =>
    readCsv("vehicles.csv").map((row) => {
        const where = `vehicles.csv ${row.vehicle_id}`;
        if (!["truck", "van"].includes(row.type)) throw new Error(`${where}: unknown type '${row.type}'`);
        if (!["reefer", "ambient"].includes(row.temp)) throw new Error(`${where}: unknown temp '${row.temp}'`);
        const isRefrigerated = row.temp === "reefer";
        const type = row.type === "van" ? "VAN" : isRefrigerated ? "REFRIGERATED_TRUCK" : "DRY_BOX_TRUCK";

        return {
            code: row.vehicle_id,
            type,
            isRefrigerated,
            maxWeightKg: toNumber(row.weight_cap_kg, `${where} weight_cap_kg`),
            maxVolumeM3: toNumber(row.volume_cap_m3, `${where} volume_cap_m3`),
            fuelKmPerLitre: toNumber(row.km_per_l, `${where} km_per_l`),
            weeklyFuelQuotaL: toNumber(row.weekly_fuel_quota_l, `${where} weekly_fuel_quota_l`),
            homeDepotId: pick(depotIdByName, row.depot, "depot", where),
            sourceAttributes: { fuel_type: row.fuel_type },
        };
    });

// ---- entry point ----

export const seedReference = async (db) => {
    // 1. depots (names must be exactly the ones the files use)
    const depotNames = new Set([
        ...readCsv("outlets.csv").map((row) => row.depot),
        ...readCsv("vehicles.csv").map((row) => row.depot),
        ...readCsv("district_travel.csv").map((row) => row.depot),
    ]);
    for (const name of depotNames) pick(DEPOTS, name, "depot", "data_files");
    if (depotNames.size !== EXPECTED.depots) {
        throw new Error(`Expected ${EXPECTED.depots} depots in the data files, found ${depotNames.size}`);
    }

    await db.depot.createMany({
        data: [...depotNames].map((name) => ({ code: DEPOTS[name].code, name: DEPOTS[name].name })),
        skipDuplicates: true,
    });
    const depots = await db.depot.findMany({ select: { id: true, code: true } });
    const depotIdByName = Object.fromEntries(
        [...depotNames].map((name) => [name, depots.find((depot) => depot.code === DEPOTS[name].code).id]),
    );

    // 2. outlets, vehicles, calendar (built and validated before anything is written)
    const outlets = buildOutlets(depotIdByName);
    const vehicles = buildVehicles(depotIdByName);
    const { rows: calendar, generated } = buildCalendar();

    if (outlets.length !== EXPECTED.outlets) throw new Error(`Expected ${EXPECTED.outlets} outlets, found ${outlets.length}`);
    if (vehicles.length !== EXPECTED.vehicles) throw new Error(`Expected ${EXPECTED.vehicles} vehicles, found ${vehicles.length}`);

    const created = {
        outlets: (await db.outlet.createMany({ data: outlets, skipDuplicates: true })).count,
        vehicles: (await db.vehicle.createMany({ data: vehicles, skipDuplicates: true })).count,
        calendarDays: (await db.calendarDay.createMany({ data: calendar, skipDuplicates: true })).count,
    };

    // 3. verify what is now in the database
    const totals = {
        depots: await db.depot.count({ where: { code: { in: Object.values(DEPOTS).map((d) => d.code) } } }),
        outlets: await db.outlet.count({ where: { code: { in: outlets.map((o) => o.code) } } }),
        vehicles: await db.vehicle.count({ where: { code: { in: vehicles.map((v) => v.code) } } }),
        refrigeratedVehicles: await db.vehicle.count({ where: { code: { in: vehicles.map((v) => v.code) }, isRefrigerated: true } }),
        calendarDays: await db.calendarDay.count(),
    };
    if (totals.depots !== EXPECTED.depots || totals.outlets !== EXPECTED.outlets || totals.vehicles !== EXPECTED.vehicles) {
        throw new Error(`Reference data counts are wrong: ${JSON.stringify(totals)}`);
    }

    logger.info(
        `Reference data ready: ${totals.depots} depots, ${totals.outlets} outlets, ${totals.vehicles} vehicles ` +
            `(${totals.refrigeratedVehicles} refrigerated), ${totals.calendarDays} calendar days ` +
            `(${generated} generated after the end of calendar.csv). Newly created this run: ${JSON.stringify(created)}.`,
    );
};
