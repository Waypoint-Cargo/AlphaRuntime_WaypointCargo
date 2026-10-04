import { getPrisma } from "../../config/database.js";
import { FuelEntryKind } from "../../generated/prisma/index.js";

const depotSelect = { id: true, code: true, name: true };

const driverSelect = {
    id: true,
    fullName: true,
    employeeNumber: true,
    phone: true,
};

export const vehicleSelect = {
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
    status: true,
    isActive: true,
    statusNote: true,
    createdAt: true,
    updatedAt: true,
    homeDepotId: true,
    homeDepot: { select: depotSelect },
    defaultDriverId: true,
    defaultDriver: { select: driverSelect },
};

// create a new vehicle
export const createVehicle = async (data) => {
    const db = getPrisma();
    return db.vehicle.create({ data, select: vehicleSelect });
};

// find vehicles matching filters, paginated
export const findVehicles = async ({
    type,
    isRefrigerated,
    depotId,
    status,
    isActive,
    search,
    skip,
    take,
}) => {
    const db = getPrisma();
    const where = {
        ...(type ? { type } : {}),
        ...(isRefrigerated !== undefined ? { isRefrigerated } : {}),
        ...(depotId ? { homeDepotId: depotId } : {}),
        ...(status ? { status } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
    };
    const [items, total] = await Promise.all([
        db.vehicle.findMany({
            where,
            select: vehicleSelect,
            orderBy: { code: "asc" },
            skip,
            take,
        }),
        db.vehicle.count({ where }),
    ]);
    return { items, total };
};

// find vehicles by operational status bucket (e.g. available, in-route, maintenance), optionally scoped
export const findVehiclesByStatuses = async ({ statuses, type, depotId }) => {
    const db = getPrisma();
    return db.vehicle.findMany({
        where: {
            isActive: true,
            status: { in: statuses },
            ...(type ? { type } : {}),
            ...(depotId ? { homeDepotId: depotId } : {}),
        },
        select: vehicleSelect,
        orderBy: { code: "asc" },
    });
};

// find active, available vehicles that satisfy a capacity/temperature/depot requirement
export const findCompatibleVehicles = async ({
    minWeightKg,
    minVolumeM3,
    requiresRefrigeration,
    vehicleType,
    depotId,
}) => {
    const db = getPrisma();
    return db.vehicle.findMany({
        where: {
            isActive: true,
            status: "AVAILABLE",
            ...(minWeightKg !== undefined ? { maxWeightKg: { gte: minWeightKg } } : {}),
            ...(minVolumeM3 !== undefined ? { maxVolumeM3: { gte: minVolumeM3 } } : {}),
            ...(requiresRefrigeration ? { isRefrigerated: true } : {}),
            ...(vehicleType ? { type: vehicleType } : {}),
            ...(depotId ? { homeDepotId: depotId } : {}),
        },
        select: vehicleSelect,
        orderBy: { maxWeightKg: "asc" },
    });
};

// find a single vehicle by id
export const findVehicleById = async (vehicleId) => {
    const db = getPrisma();
    return db.vehicle.findUnique({ where: { id: vehicleId }, select: vehicleSelect });
};

// find a vehicle by its registration/fleet code (uniqueness checks)
export const findVehicleByCode = async (code) => {
    const db = getPrisma();
    return db.vehicle.findUnique({ where: { code }, select: { id: true, code: true } });
};

// update vehicle details (capacity, fuel profile, depot, driver, notes, isActive)
export const updateVehicle = async (vehicleId, data) => {
    const db = getPrisma();
    return db.vehicle.update({ where: { id: vehicleId }, data, select: vehicleSelect });
};

// update only the operational status (+ optional note)
export const updateVehicleStatus = async (vehicleId, { status, statusNote }) => {
    const db = getPrisma();
    return db.vehicle.update({
        where: { id: vehicleId },
        data: { status, ...(statusNote !== undefined ? { statusNote } : {}) },
        select: vehicleSelect,
    });
};

// permanently delete a vehicle
export const deleteVehicle = async (vehicleId) => {
    const db = getPrisma();
    return db.vehicle.delete({ where: { id: vehicleId } });
};

// counts grouped by operational status, for fleet summary tiles
export const countVehiclesByStatus = async () => {
    const db = getPrisma();
    return db.vehicle.groupBy({
        by: ["status"],
        where: { isActive: true },
        _count: { _all: true },
    });
};

// counts grouped by vehicle type, for the fleet type filter tabs
export const countVehiclesByType = async () => {
    const db = getPrisma();
    return db.vehicle.groupBy({
        by: ["type"],
        where: { isActive: true },
        _count: { _all: true },
    });
};

// total active + total (incl. deactivated) vehicle counts
export const countVehicles = async () => {
    const db = getPrisma();
    const [active, total] = await Promise.all([
        db.vehicle.count({ where: { isActive: true } }),
        db.vehicle.count(),
    ]);
    return { active, total };
};

// find a depot by id (used to validate homeDepotId on create/update)
export const findDepotById = async (depotId) => {
    const db = getPrisma();
    return db.depot.findUnique({ where: { id: depotId }, select: depotSelect });
};

// list all depots, for the home-depot picker
export const findDepots = async () => {
    const db = getPrisma();
    return db.depot.findMany({ select: depotSelect, orderBy: { code: "asc" } });
};

// find a driver candidate by id (used to validate defaultDriverId on create/update)
export const findDriverById = async (userId) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true, isApproved: true, defaultVehicle: { select: { id: true, code: true } } },
    });
};

// sum this week's actual/adjustment fuel litres per vehicle, for the fleet list/summary views
export const sumFuelConsumedThisWeekByVehicleIds = async (vehicleIds, weekStart) => {
    const db = getPrisma();
    if (vehicleIds.length === 0) return [];
    return db.fuelLedgerEntry.groupBy({
        by: ["vehicleId"],
        where: {
            vehicleId: { in: vehicleIds },
            weekStart,
            kind: { in: [FuelEntryKind.ACTUAL, FuelEntryKind.ADJUSTMENT] },
        },
        _sum: { litres: true },
    });
};

// sum this week's actual/adjustment fuel litres for a single vehicle
export const sumFuelConsumedThisWeek = async (vehicleId, weekStart) => {
    const db = getPrisma();
    const result = await db.fuelLedgerEntry.aggregate({
        where: {
            vehicleId,
            weekStart,
            kind: { in: [FuelEntryKind.ACTUAL, FuelEntryKind.ADJUSTMENT] },
        },
        _sum: { litres: true },
    });
    return result._sum.litres ?? 0;
};

// record a fuel ledger entry for a vehicle (not tied to a trip yet — tripId is null until the trips module exists)
export const createFuelLedgerEntry = async ({ vehicleId, weekStart, kind, distanceKm, litres, note }) => {
    const db = getPrisma();
    return db.fuelLedgerEntry.create({
        data: { vehicleId, weekStart, kind, distanceKm, litres, note },
    });
};

// record the PLANNED fuel of a trip when its plan is published (unique per trip + kind, so a retry cannot double-count)
export const createPlannedFuelEntryTx = async (tx, { vehicleId, weekStart, tripId, distanceKm, litres, note }) => {
    const existing = await tx.fuelLedgerEntry.findFirst({ where: { tripId, kind: FuelEntryKind.PLANNED }, select: { id: true } });
    if (existing) {
        return tx.fuelLedgerEntry.update({ where: { id: existing.id }, data: { vehicleId, weekStart, distanceKm, litres, note } });
    }
    return tx.fuelLedgerEntry.create({ data: { vehicleId, weekStart, tripId, kind: FuelEntryKind.PLANNED, distanceKm, litres, note } });
};
