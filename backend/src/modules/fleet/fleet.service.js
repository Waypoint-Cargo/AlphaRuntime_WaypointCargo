import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { mondayOf, todayBusinessDate } from "../../utils/businessTime.js";
import { toNumber } from "../../utils/serialize.js";
import * as usersService from "../users/users.service.js";
import * as auditService from "../audit/audit.service.js";
import * as tripsService from "../trips/trips.service.js";
import {
    findVehicleByDefaultDriver,
    findVehicleById,
    findVehicleByIdTx,
    findWeeklyFuelRows,
    listActiveVehiclesOfDepot,
    listVehicles,
    summarizeVehicles,
    updateVehicleTx,
} from "./fleet.repository.js";
import {
    toFleetSummaryDTO,
    toVehicleDetailDTO,
    toVehicleDTO,
    toVehicleListDTO,
} from "./fleet.dto.js";

// ---- used by other services ----

// Weekly fuel of several vehicles for the ISO week starting weekStart ("YYYY-MM-DD", a Monday):
// Map(vehicleId -> { weekStart, quotaL, usedL, remainingL }).
// A vehicle with no ledger entries that week has used = 0 and remaining = quota.
export const getWeeklyFuelForVehicles = async (vehicles, weekStart) => {
    const rows = vehicles.length > 0 ? await findWeeklyFuelRows(vehicles.map((vehicle) => vehicle.id), weekStart) : [];
    const byVehicle = new Map(rows.map((row) => [row.vehicleId, row]));

    return new Map(
        vehicles.map((vehicle) => {
            const quotaL = toNumber(vehicle.weeklyFuelQuotaL);
            const row = byVehicle.get(vehicle.id);
            return [
                vehicle.id,
                row
                    ? { weekStart, quotaL: row.quotaL, usedL: row.usedL, remainingL: row.remainingL }
                    : { weekStart, quotaL, usedL: 0, remainingL: quotaL },
            ];
        }),
    );
};

export const getWeeklyFuel = async (vehicleId, weekStart) => {
    const vehicle = await findVehicleById(vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);
    return (await getWeeklyFuelForVehicles([vehicle], weekStart)).get(vehicleId);
};

// active vehicles of a depot in the client shape; pass a transaction to read inside it
export const listActiveDepotVehicles = async (depotId, tx) => {
    return (await listActiveVehiclesOfDepot(depotId, tx)).map(toVehicleDTO);
};

// Active vehicles of the depots (null = all) that still have a trip to give on a date: fewer than
// maxTrips trips (the daily limit) are planned for them.
export const countAvailableVehicles = async ({ depotIds, date, maxTrips }) => {
    const [{ active }, full] = await Promise.all([
        summarizeVehicles(depotIds),
        tripsService.countVehiclesAtTripLimit({ depotIds, date, minTrips: maxTrips }),
    ]);
    return active - full;
};

// one vehicle in the client shape (404 when missing)
export const getVehicle = async (vehicleId) => {
    const vehicle = await findVehicleById(vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);
    return toVehicleDTO(vehicle);
};

// ---- endpoints ----

// dispatchers work on their depots, admins see everything
const depotFilterFor = (scope) => (scope.role === Role.ADMIN ? null : scope.depotIds);

export const listFleetService = async ({ userId, depotId, type, isRefrigerated, isActive, q, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    if (depotId) assertDepotAccess(scope, depotId);

    const depotIds = depotFilterFor(scope);
    const where = {
        ...(depotId ? { homeDepotId: depotId } : depotIds ? { homeDepotId: { in: depotIds } } : {}),
        ...(type && { type }),
        ...(isRefrigerated !== undefined && { isRefrigerated }),
        ...(isActive !== undefined && { isActive }),
        ...(q && { code: { contains: q, mode: "insensitive" } }),
    };

    const { rows, total } = await listVehicles({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toVehicleListDTO(rows, { page, pageSize, total });
};

export const getFleetSummaryService = async ({ userId, date, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    const day = date ?? todayBusinessDate(now);
    const depotIds = depotFilterFor(scope);

    const counts = await summarizeVehicles(depotIds);
    const trips = await tripsService.countVehiclesWithTrips({ depotIds, date: day });

    return toFleetSummaryDTO({ date: day, ...counts, ...trips });
};

const buildVehicleDetail = async (vehicle, date) => {
    const [trips, fuel] = await Promise.all([
        tripsService.listVehicleTripsOnDate(vehicle.id, date),
        getWeeklyFuelForVehicles([vehicle], mondayOf(date)).then((fuelByVehicle) => fuelByVehicle.get(vehicle.id)),
    ]);
    return toVehicleDetailDTO({ vehicle, date, trips, fuel });
};

export const getVehicleService = async ({ userId, id, date, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    const vehicle = await findVehicleById(id);
    if (!vehicle) throw new AppError("Vehicle not found.", 404);

    if (scope.role === Role.DRIVER) {
        // a driver only sees the vehicle he or she is the default driver of
        if (vehicle.defaultDriverId !== scope.userId) throw new AppError("You do not have access to this resource.", 403);
    } else {
        assertDepotAccess(scope, vehicle.homeDepotId);
    }

    return buildVehicleDetail(vehicle, date ?? todayBusinessDate(now));
};

export const getMyVehicleService = async ({ userId, date, now = new Date() }) => {
    const vehicle = await findVehicleByDefaultDriver(userId);
    if (!vehicle) throw new AppError("No vehicle is assigned to you.", 404);
    return buildVehicleDetail(vehicle, date ?? todayBusinessDate(now));
};

export const updateVehicleService = async ({ id, isActive, statusNote, defaultDriverId, context }) => {
    const existing = await findVehicleById(id);
    if (!existing) throw new AppError("Vehicle not found.", 404);

    if (defaultDriverId) {
        // must be an active, approved DRIVER, and drive no other vehicle
        const driver = await usersService.getUserService({ id: defaultDriverId }).catch((error) => {
            if (error.statusCode === 404) throw new AppError("Driver not found.", 422);
            throw error;
        });
        if (driver.role !== Role.DRIVER || !driver.isActive || !driver.isApproved) {
            throw new AppError("The default driver must be an active, approved user with the DRIVER role.", 422);
        }
        const other = await findVehicleByDefaultDriver(defaultDriverId);
        if (other && other.id !== id) {
            throw new AppError(`This driver is already the default driver of vehicle ${other.code}.`, 409);
        }
    }

    const data = {
        ...(isActive !== undefined && { isActive }),
        ...(statusNote !== undefined && { statusNote }),
        ...(defaultDriverId !== undefined && { defaultDriverId }),
    };

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        const before = await findVehicleByIdTx(tx, id);
        await updateVehicleTx(tx, id, data);

        const changed = Object.keys(data);
        await auditService.recordTx(tx, {
            ...context,
            action: "VEHICLE_UPDATED",
            entityType: "Vehicle",
            entityId: id,
            before: Object.fromEntries(changed.map((field) => [field, before[field]])),
            after: data,
        });
    });

    return toVehicleDTO(await findVehicleById(id));
};
