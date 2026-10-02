import { AppError } from "../../utils/appError.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { addDays, fromYmd, toYmd } from "../../utils/businessTime.js";
import { roundTo, toNumber } from "../../utils/serialize.js";
import * as usersService from "../users/users.service.js";
import * as auditService from "../audit/audit.service.js";
import * as referenceService from "../reference/reference.service.js";
import * as fleetService from "../fleet/fleet.service.js";
import { MAX_TRIPS_PER_DAY } from "../allocations/allocations.service.js";
import { createForecastsTx, deleteForecastsTx, findExistingTx, listForecasts, lockImportTx } from "./forecast.repository.js";
import { toCapacityDepotDTO, toCapacityDTO, toDemandListDTO, toImportResultDTO } from "./forecast.dto.js";

const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

// a vehicle runs at most two trips a day
const TRIPS_PER_VEHICLE_PER_DAY = MAX_TRIPS_PER_DAY;

// refrigerated vehicles serve chilled and frozen demand; every other vehicle serves ambient demand
const GROUP_TEMP_CLASSES = { refrigerated: ["CHILLED", "FROZEN"], ambient: ["AMBIENT"] };

// the days of a week the plan covers: Monday to Saturday, when the calendar says it is an operating day
const WEEK_DAY_OFFSETS = [0, 1, 2, 3, 4, 5];

const FORMULA = Object.freeze({
    tripsPerVehiclePerDay: TRIPS_PER_VEHICLE_PER_DAY,
    days: "Monday to Saturday of the week that the operating calendar marks as operating days",
    groups: {
        refrigerated: "CHILLED and FROZEN demand, served by refrigerated vehicles only",
        ambient: "AMBIENT demand, served by the vehicles that are not refrigerated",
    },
    forecast: "sum of weightKg and volumeM3 of the group's forecast rows; per day the model version with the latest generatedAt",
    capacity: `(sum of maxWeightKg and maxVolumeM3 of the depot's active vehicles in the group) x ${TRIPS_PER_VEHICLE_PER_DAY} trips`,
    vehiclesNeeded: `ceil( max( forecastWeightKg / averageVehicleWeightKg, forecastVolumeM3 / averageVehicleVolumeM3 ) / ${TRIPS_PER_VEHICLE_PER_DAY} )`,
    driversNeeded: "equal to vehiclesNeeded (each vehicle has one driver)",
    gap: "vehiclesNeeded - activeVehicles; above 0 means the depot is short of vehicles",
});

// ---- choosing the model version ----

// For every depot and date the rows of the model version with the latest generatedAt (ties: the greater
// version name). Rows of older versions for that depot and date are dropped.
const latestVersionPerDay = (rows) => {
    const best = new Map();
    for (const row of rows) {
        const key = `${toYmd(row.forecastDate)}|${row.depotId}`;
        const current = best.get(key);
        const newer =
            !current ||
            row.generatedAt.getTime() > current.generatedAt.getTime() ||
            (row.generatedAt.getTime() === current.generatedAt.getTime() && row.modelVersion > current.modelVersion);
        if (newer) best.set(key, row);
    }
    return rows.filter((row) => best.get(`${toYmd(row.forecastDate)}|${row.depotId}`).modelVersion === row.modelVersion);
};

// dispatchers work on their depots (all of them unless one is asked for)
const resolveDepotIds = (scope, depotId) => {
    if (!depotId) return scope.depotIds;
    assertDepotAccess(scope, depotId);
    return [depotId];
};

// ---- import ----

const rowKey = (row) => `${toYmd(row.forecastDate)}|${row.depotId}|${row.brand}|${row.tempClass}`;

// Imports a model's forecast: a row for the same date, depot, brand, temperature class and model version
// replaces the one already stored (new rows are added), all in one transaction.
export const importForecastService = async ({ modelVersion, generatedAt, rows, context }) => {
    const depots = new Set((await referenceService.listDepotsService()).items.map((depot) => depot.id));
    const unknown = rows.map((row, index) => ({ row, index })).filter(({ row }) => !depots.has(row.depotId));
    if (unknown.length > 0) {
        throw new AppError(
            "Some rows name a depot that does not exist.",
            422,
            unknown.slice(0, 50).map(({ row, index }) => ({ field: `rows.${index}.depotId`, message: `Depot ${row.depotId} not found.`, code: "not_found" })),
        );
    }

    const data = rows.map((row) => ({
        forecastDate: fromYmd(row.forecastDate),
        depotId: row.depotId,
        brand: row.brand,
        tempClass: row.tempClass,
        ordersExpected: row.ordersExpected ?? null,
        weightKg: row.weightKg ?? null,
        volumeM3: row.volumeM3 ?? null,
        lowerBound: row.lowerBound ?? null,
        upperBound: row.upperBound ?? null,
        modelVersion,
        generatedAt,
    }));
    const dates = data.map((row) => row.forecastDate.getTime());

    const result = await getPrisma().$transaction(async (tx) => {
        await lockImportTx(tx, modelVersion);

        const existing = await findExistingTx(tx, {
            modelVersion,
            depotIds: [...new Set(data.map((row) => row.depotId))],
            from: new Date(Math.min(...dates)),
            to: new Date(Math.max(...dates)),
        });
        const incoming = new Set(data.map(rowKey));
        const replaced = existing.filter((row) => incoming.has(rowKey(row)));

        if (replaced.length > 0) await deleteForecastsTx(tx, replaced.map((row) => row.id));
        await createForecastsTx(tx, data);

        const summary = { modelVersion, generatedAt, received: data.length, created: data.length - replaced.length, updated: replaced.length };

        await auditService.recordTx(tx, {
            ...context,
            action: "FORECAST_IMPORTED",
            entityType: "DemandForecast",
            entityId: modelVersion,
            after: {
                modelVersion,
                generatedAt,
                rows: data.length,
                created: summary.created,
                updated: summary.updated,
                from: toYmd(new Date(Math.min(...dates))),
                to: toYmd(new Date(Math.max(...dates))),
                depots: [...new Set(data.map((row) => row.depotId))].length,
            },
        });
        return summary;
    }, TX_OPTIONS);

    return toImportResultDTO(result);
};

// ---- demand ----

export const getDemandService = async ({ userId, from, to, depotId, brand, tempClass, modelVersion, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    const depotIds = resolveDepotIds(scope, depotId);

    const all = await listForecasts({ depotIds, from: fromYmd(from), to: fromYmd(to) });

    // the latest model per date is chosen before brand and temperature class filter the rows, so one
    // date never mixes rows of two models
    const chosen = modelVersion ? all.filter((row) => row.modelVersion === modelVersion) : latestVersionPerDay(all);
    const rows = chosen.filter((row) => (!brand || row.brand === brand) && (!tempClass || row.tempClass === tempClass));

    return toDemandListDTO(rows.slice((page - 1) * pageSize, page * pageSize), { from, to, page, pageSize, total: rows.length });
};

// ---- capacity plan ----

const sumOf = (rows, field) => roundTo(rows.reduce((sum, row) => sum + (toNumber(row[field]) ?? 0), 0), 3);

// what a group of vehicles can carry in a day and how many of them the forecast needs
const planGroup = ({ vehicles, rows }) => {
    const forecastWeightKg = sumOf(rows, "weightKg");
    const forecastVolumeM3 = sumOf(rows, "volumeM3");
    const capacityWeightKg = roundTo(vehicles.reduce((sum, vehicle) => sum + vehicle.maxWeightKg, 0) * TRIPS_PER_VEHICLE_PER_DAY, 2);
    const capacityVolumeM3 = roundTo(vehicles.reduce((sum, vehicle) => sum + vehicle.maxVolumeM3, 0) * TRIPS_PER_VEHICLE_PER_DAY, 3);

    // without a vehicle there is no average capacity, so the need cannot be worked out
    let vehiclesNeeded = null;
    if (vehicles.length > 0) {
        const averageWeightKg = vehicles.reduce((sum, vehicle) => sum + vehicle.maxWeightKg, 0) / vehicles.length;
        const averageVolumeM3 = vehicles.reduce((sum, vehicle) => sum + vehicle.maxVolumeM3, 0) / vehicles.length;
        vehiclesNeeded = Math.ceil(Math.max(forecastWeightKg / averageWeightKg, forecastVolumeM3 / averageVolumeM3) / TRIPS_PER_VEHICLE_PER_DAY);
    } else if (forecastWeightKg === 0 && forecastVolumeM3 === 0) {
        vehiclesNeeded = 0;
    }

    return {
        modelVersion: rows[0]?.modelVersion ?? null,
        forecastWeightKg,
        forecastVolumeM3,
        capacityWeightKg,
        capacityVolumeM3,
        activeVehicles: vehicles.length,
        vehiclesNeeded,
        driversNeeded: vehiclesNeeded,
        gap: vehiclesNeeded === null ? null : vehiclesNeeded - vehicles.length,
    };
};

const fleetSummary = (vehicles) => ({
    vehicles: vehicles.length,
    averageWeightKg: vehicles.length ? roundTo(vehicles.reduce((sum, vehicle) => sum + vehicle.maxWeightKg, 0) / vehicles.length, 2) : null,
    averageVolumeM3: vehicles.length ? roundTo(vehicles.reduce((sum, vehicle) => sum + vehicle.maxVolumeM3, 0) / vehicles.length, 3) : null,
});

export const getCapacityService = async ({ userId, weekStart, depotId }) => {
    const scope = await usersService.getScope(userId);
    const depotIds = resolveDepotIds(scope, depotId);

    const weekEnd = addDays(weekStart, WEEK_DAY_OFFSETS.at(-1));
    const [calendar, depots] = await Promise.all([
        referenceService.listCalendarService({ from: weekStart, to: weekEnd }),
        referenceService.listDepotsService(),
    ]);
    const operatingDays = calendar.items.filter((day) => day.isOperatingDay);

    const results = [];
    for (const id of depotIds) {
        const depot = depots.items.find((candidate) => candidate.id === id);
        if (!depot) continue;

        const vehicles = await fleetService.listActiveDepotVehicles(id);
        const fleet = {
            refrigerated: vehicles.filter((vehicle) => vehicle.isRefrigerated),
            ambient: vehicles.filter((vehicle) => !vehicle.isRefrigerated),
        };
        const forecast = latestVersionPerDay(await listForecasts({ depotIds: [id], from: fromYmd(weekStart), to: fromYmd(weekEnd) }));

        const days = operatingDays.map((day) => {
            const ofDay = forecast.filter((row) => toYmd(row.forecastDate) === day.date);
            const plan = (group) =>
                planGroup({ vehicles: fleet[group], rows: ofDay.filter((row) => GROUP_TEMP_CLASSES[group].includes(row.tempClass)) });
            return { date: day.date, isPayday: day.isPayday, festivalName: day.festivalName, refrigerated: plan("refrigerated"), ambient: plan("ambient") };
        });

        results.push(
            toCapacityDepotDTO({
                depot,
                fleet: { refrigerated: fleetSummary(fleet.refrigerated), ambient: fleetSummary(fleet.ambient) },
                days,
            }),
        );
    }

    return toCapacityDTO({ weekStart, formula: FORMULA, depots: results });
};
