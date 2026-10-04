import { AppError } from "../../utils/appError.js";
import { Role, FuelEntryKind } from "../../generated/prisma/index.js";
import {
    createVehicle,
    findVehicles,
    findVehiclesByStatuses,
    findCompatibleVehicles,
    findVehicleById,
    findVehicleByCode,
    updateVehicle,
    updateVehicleStatus,
    deleteVehicle,
    countVehiclesByStatus,
    countVehiclesByType,
    countVehicles,
    findDepotById,
    findDepots,
    findDriverById,
    sumFuelConsumedThisWeekByVehicleIds,
    sumFuelConsumedThisWeek,
    createFuelLedgerEntry,
} from "./fleet.repository.js";
import {
    toVehicleDTO,
    toVehicleListResponseDTO,
    toVehicleArrayDTO,
    toFuelSummaryDTO,
    toDepotListDTO,
    toFleetStatsDTO,
} from "./fleet.dto.js";

// Only these transitions are allowed when a dispatcher/admin changes a vehicle's operational status.
// Trip/loading modules will later drive these same transitions automatically; for now they're manual.
const VALID_STATUS_TRANSITIONS = {
    AVAILABLE: ["ASSIGNED", "MAINTENANCE"],
    ASSIGNED: ["ON_ROUTE", "AVAILABLE", "MAINTENANCE"],
    ON_ROUTE: ["AVAILABLE", "MAINTENANCE"],
    MAINTENANCE: ["AVAILABLE"],
};

// Statuses that mean "committed to a delivery run right now" — a vehicle in either of
// these cannot be deactivated/deleted/reassigned without first returning to AVAILABLE.
const COMMITTED_STATUSES = ["ASSIGNED", "ON_ROUTE"];

// Monday 00:00 UTC of the current week — matches how `weekStart DateTime @db.Date` is
// stored elsewhere (date-only columns), and is the bucket FuelLedgerEntry rows key off.
const getCurrentWeekStart = () => {
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = utcDate.getUTCDay(); // 0 = Sunday .. 6 = Saturday
    const diffToMonday = day === 0 ? 6 : day - 1;
    utcDate.setUTCDate(utcDate.getUTCDate() - diffToMonday);
    return utcDate;
};

const buildFuelMap = (groupByResult) =>
    new Map(groupByResult.map((row) => [row.vehicleId, Number(row._sum.litres ?? 0)]));

// Shared guard for create/update: homeDepotId must point to a real depot.
const assertDepotExists = async (homeDepotId) => {
    const depot = await findDepotById(homeDepotId);
    if (!depot) throw new AppError("Depot not found.", 404);
};

// Shared guard for create/update: defaultDriverId must be an approved, active DRIVER
// that isn't already the default driver of a different vehicle (one vehicle per driver).
const assertDriverAssignable = async (defaultDriverId, vehicleId) => {
    const driver = await findDriverById(defaultDriverId);
    if (!driver) throw new AppError("Driver not found.", 404);
    if (driver.role !== Role.DRIVER) throw new AppError("Default driver must have the DRIVER role.", 400);
    if (!driver.isActive || !driver.isApproved) {
        throw new AppError("Default driver must be an active, approved account.", 400);
    }
    if (driver.defaultVehicle && driver.defaultVehicle.id !== vehicleId) {
        throw new AppError(
            `This driver is already the default driver for vehicle ${driver.defaultVehicle.code}.`,
            409,
        );
    }
};

export const createVehicleService = async ({
    code,
    type,
    isRefrigerated,
    tempMinC,
    tempMaxC,
    maxWeightKg,
    maxVolumeM3,
    fuelKmPerLitre,
    weeklyFuelQuotaL,
    homeDepotId,
    defaultDriverId,
    statusNote,
}) => {
    const existing = await findVehicleByCode(code);
    if (existing) throw new AppError("A vehicle with this code already exists.", 409);

    await assertDepotExists(homeDepotId);
    if (defaultDriverId) await assertDriverAssignable(defaultDriverId, null);

    const vehicle = await createVehicle({
        code,
        type,
        isRefrigerated,
        tempMinC,
        tempMaxC,
        maxWeightKg,
        maxVolumeM3,
        fuelKmPerLitre,
        weeklyFuelQuotaL,
        homeDepotId,
        defaultDriverId,
        statusNote,
    });

    const weekStart = getCurrentWeekStart();
    return toVehicleDTO(vehicle, toFuelSummaryDTO({ weeklyFuelQuotaL: vehicle.weeklyFuelQuotaL, consumedL: 0, weekStart }));
};

export const listVehiclesService = async ({ type, isRefrigerated, depotId, status, isActive, search, page, limit }) => {
    const { items, total } = await findVehicles({
        type,
        isRefrigerated,
        depotId,
        status,
        isActive,
        search,
        skip: (page - 1) * limit,
        take: limit,
    });

    const weekStart = getCurrentWeekStart();
    const fuelRows = await sumFuelConsumedThisWeekByVehicleIds(items.map((v) => v.id), weekStart);
    return toVehicleListResponseDTO({ items, total, page, limit, fuelByVehicleId: buildFuelMap(fuelRows), weekStart });
};

export const getVehicleService = async ({ vehicleId }) => {
    const vehicle = await findVehicleById(vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);

    const weekStart = getCurrentWeekStart();
    const consumedL = await sumFuelConsumedThisWeek(vehicleId, weekStart);
    return toVehicleDTO(vehicle, toFuelSummaryDTO({ weeklyFuelQuotaL: vehicle.weeklyFuelQuotaL, consumedL, weekStart }));
};

export const updateVehicleService = async ({ vehicleId, isActive, homeDepotId, defaultDriverId, code, ...fields }) => {
    const vehicle = await findVehicleById(vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);

    if (code && code !== vehicle.code) {
        const existing = await findVehicleByCode(code);
        if (existing) throw new AppError("A vehicle with this code already exists.", 409);
    }

    if (homeDepotId) await assertDepotExists(homeDepotId);

    // defaultDriverId may be explicitly null (unassign the driver) — only validate when assigning one.
    if (defaultDriverId) await assertDriverAssignable(defaultDriverId, vehicleId);

    if (isActive === false && COMMITTED_STATUSES.includes(vehicle.status)) {
        throw new AppError(
            "This vehicle is assigned or on route. Reassign or complete its current trip before deactivating it.",
            409,
        );
    }

    const updated = await updateVehicle(vehicleId, {
        ...fields,
        ...(code ? { code } : {}),
        ...(homeDepotId ? { homeDepotId } : {}),
        ...(defaultDriverId !== undefined ? { defaultDriverId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
    });

    const weekStart = getCurrentWeekStart();
    const consumedL = await sumFuelConsumedThisWeek(vehicleId, weekStart);
    return toVehicleDTO(updated, toFuelSummaryDTO({ weeklyFuelQuotaL: updated.weeklyFuelQuotaL, consumedL, weekStart }));
};

export const updateVehicleStatusService = async ({ vehicleId, status, statusNote }) => {
    const vehicle = await findVehicleById(vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);
    if (!vehicle.isActive) throw new AppError("Cannot change the status of a deactivated vehicle.", 400);

    if (status !== vehicle.status) {
        const allowedNextStatuses = VALID_STATUS_TRANSITIONS[vehicle.status] ?? [];
        if (!allowedNextStatuses.includes(status)) {
            throw new AppError(`Cannot change vehicle status from ${vehicle.status} to ${status}.`, 409);
        }
    }

    const updated = await updateVehicleStatus(vehicleId, { status, statusNote });

    const weekStart = getCurrentWeekStart();
    const consumedL = await sumFuelConsumedThisWeek(vehicleId, weekStart);
    return toVehicleDTO(updated, toFuelSummaryDTO({ weeklyFuelQuotaL: updated.weeklyFuelQuotaL, consumedL, weekStart }));
};

export const deleteVehicleService = async ({ vehicleId }) => {
    const vehicle = await findVehicleById(vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);

    if (COMMITTED_STATUSES.includes(vehicle.status)) {
        throw new AppError(
            "This vehicle is assigned or on route. Reassign or complete its current trip before deleting it.",
            409,
        );
    }

    try {
        await deleteVehicle(vehicleId);
    } catch (error) {
        // Foreign key restrictions (trips driven, fuel logs, etc.) block the delete.
        if (error.code === "P2003") {
            throw new AppError(
                "This vehicle has associated records (trips, fuel logs, etc.) and cannot be deleted. Deactivate it instead.",
                409,
            );
        }
        throw error;
    }
};

export const listAvailableVehiclesService = async ({ type, depotId }) => {
    const items = await findVehiclesByStatuses({ statuses: ["AVAILABLE"], type, depotId });
    const weekStart = getCurrentWeekStart();
    const fuelRows = await sumFuelConsumedThisWeekByVehicleIds(items.map((v) => v.id), weekStart);
    return toVehicleArrayDTO(items, buildFuelMap(fuelRows), weekStart);
};

export const listInRouteVehiclesService = async ({ type, depotId }) => {
    const items = await findVehiclesByStatuses({ statuses: ["ASSIGNED", "ON_ROUTE"], type, depotId });
    const weekStart = getCurrentWeekStart();
    const fuelRows = await sumFuelConsumedThisWeekByVehicleIds(items.map((v) => v.id), weekStart);
    return toVehicleArrayDTO(items, buildFuelMap(fuelRows), weekStart);
};

export const listMaintenanceVehiclesService = async ({ type, depotId }) => {
    const items = await findVehiclesByStatuses({ statuses: ["MAINTENANCE"], type, depotId });
    const weekStart = getCurrentWeekStart();
    const fuelRows = await sumFuelConsumedThisWeekByVehicleIds(items.map((v) => v.id), weekStart);
    return toVehicleArrayDTO(items, buildFuelMap(fuelRows), weekStart);
};

export const listCompatibleVehiclesService = async ({ tempClass, weightKg, volumeM3, depotId, vanOnly }) => {
    // CHILLED/FROZEN orders need a reefer unit; AMBIENT can ride in any vehicle, refrigerated or not.
    const requiresRefrigeration = tempClass === "CHILLED" || tempClass === "FROZEN";
    // Mall/parking-constrained outlets can only be served by a van, regardless of the temp requirement.
    const vehicleType = vanOnly ? "VAN" : undefined;

    const items = await findCompatibleVehicles({
        minWeightKg: weightKg,
        minVolumeM3: volumeM3,
        requiresRefrigeration,
        vehicleType,
        depotId,
    });

    const weekStart = getCurrentWeekStart();
    const fuelRows = await sumFuelConsumedThisWeekByVehicleIds(items.map((v) => v.id), weekStart);
    return toVehicleArrayDTO(items, buildFuelMap(fuelRows), weekStart);
};

export const listDepotsService = async () => {
    const depots = await findDepots();
    return toDepotListDTO(depots);
};

export const fleetStatsService = async () => {
    const [statusGroups, typeGroups, counts] = await Promise.all([
        countVehiclesByStatus(),
        countVehiclesByType(),
        countVehicles(),
    ]);

    const byStatus = Object.fromEntries(statusGroups.map((row) => [row.status, row._count._all]));
    const byType = Object.fromEntries(typeGroups.map((row) => [row.type, row._count._all]));

    return toFleetStatsDTO({ total: counts.total, active: counts.active, byStatus, byType });
};

export const createFuelEntryService = async ({ vehicleId, litres, distanceKm, note }) => {
    const vehicle = await findVehicleById(vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);

    const weekStart = getCurrentWeekStart();
    await createFuelLedgerEntry({
        vehicleId,
        weekStart,
        kind: FuelEntryKind.ACTUAL,
        distanceKm,
        litres,
        note,
    });

    const consumedL = await sumFuelConsumedThisWeek(vehicleId, weekStart);
    return toVehicleDTO(vehicle, toFuelSummaryDTO({ weeklyFuelQuotaL: vehicle.weeklyFuelQuotaL, consumedL, weekStart }));
};
