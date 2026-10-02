import { getPrisma } from "../../config/database.js";

const vehicleSelect = {
    id: true,
    code: true,
    type: true,
    isRefrigerated: true,
    tempMinC: true,
    tempMaxC: true,
    maxWeightKg: true,
    maxVolumeM3: true,
    fuelKmPerLitre: true,
    weeklyFuelQuotaL: true,
    homeDepotId: true,
    homeDepot: { select: { id: true, code: true, name: true } },
    defaultDriverId: true,
    defaultDriver: { select: { id: true, fullName: true } },
    isActive: true,
    statusNote: true,
};

// page of vehicles + total count for the same filter
export const listVehicles = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.vehicle.findMany({ where, orderBy: [{ code: "asc" }], skip, take, select: vehicleSelect }),
        db.vehicle.count({ where }),
    ]);
    return { rows, total };
};

export const findVehicleById = async (id) => {
    const db = getPrisma();
    return db.vehicle.findUnique({ where: { id }, select: vehicleSelect });
};

export const findVehicleByIdTx = (tx, id) => {
    return tx.vehicle.findUnique({ where: { id }, select: vehicleSelect });
};

// the vehicle a driver is the default driver of (one vehicle per driver)
export const findVehicleByDefaultDriver = async (driverId) => {
    const db = getPrisma();
    return db.vehicle.findUnique({ where: { defaultDriverId: driverId }, select: vehicleSelect });
};

// active vehicles of a depot; pass a transaction to read inside it
export const listActiveVehiclesOfDepot = async (depotId, tx) => {
    const client = tx ?? getPrisma();
    return client.vehicle.findMany({
        where: { homeDepotId: depotId, isActive: true },
        orderBy: { code: "asc" },
        select: vehicleSelect,
    });
};

// fleet counts for the given depots (all depots when depotIds is null)
export const summarizeVehicles = async (depotIds) => {
    const db = getPrisma();
    const where = depotIds ? { homeDepotId: { in: depotIds } } : {};
    const [total, active, refrigerated] = await db.$transaction([
        db.vehicle.count({ where }),
        db.vehicle.count({ where: { ...where, isActive: true } }),
        db.vehicle.count({ where: { ...where, isRefrigerated: true } }),
    ]);
    return { total, active, refrigerated };
};

export const updateVehicleTx = (tx, id, data) => {
    return tx.vehicle.update({ where: { id }, data, select: { id: true } });
};

// ---- weekly fuel (view vehicle_week_fuel; one row per vehicle and ISO week that has ledger entries) ----

export const findWeeklyFuelRows = async (vehicleIds, weekStart) => {
    const db = getPrisma();
    return db.$queryRaw`
        SELECT "vehicleId", "weekStart"::text AS "weekStart",
               "quotaL"::float8 AS "quotaL", "usedL"::float8 AS "usedL",
               "usedKm"::float8 AS "usedKm", "remainingL"::float8 AS "remainingL"
          FROM vehicle_week_fuel
         WHERE "vehicleId" = ANY(${vehicleIds}::text[]) AND "weekStart" = ${weekStart}::date`;
};

// planned fuel of a published plan, one ledger entry per trip
export const createPlannedFuelEntriesTx = (tx, entries) => {
    return tx.fuelLedgerEntry.createMany({
        data: entries.map((entry) => ({ ...entry, kind: "PLANNED" })),
    });
};
