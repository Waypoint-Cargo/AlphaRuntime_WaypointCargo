import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess, assertTripDriver } from "../../utils/scope.js";
import { addDays, fromYmd, mondayOf, toYmd } from "../../utils/businessTime.js";
import { roundTo, toNumber } from "../../utils/serialize.js";
import * as usersService from "../users/users.service.js";
import * as auditService from "../audit/audit.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
// the plan lock has to be taken in the same transaction as the trip changes
import { lockPlanTx } from "../plans/plans.repository.js";
import {
    countVehiclesWithAtLeastTrips,
    countVehiclesWithTripsOnDate,
    createSequenceRequestTx,
    decideSequenceRequestTx,
    findPendingSequenceRequest,
    findSequenceRequestById,
    findTripCore,
    findTripDetail,
    findDepotTripsForDate,
    findStopOrdersWithItemsTx,
    findStopRef,
    findTripForTotalsTx,
    findTripOrdersTx,
    findTripRef,
    findTripStatusTx,
    findVehicleTripInTransit,
    findVehicleTripsOnDate,
    listSequenceRequests,
    listTripStopStatusesTx,
    listTripStopsTx,
    listTrips,
    listTripsOfPlan,
    reorderStopsTx,
    sumUnpublishedPlannedFuel,
    updateStopLegDistancesTx,
    updateStopStatusTx,
    updateTripDriverTx,
    updateTripStatusTx,
    updateTripTotalsTx,
} from "./trips.repository.js";
import {
    toDepotTripDTO,
    toSequenceRequestDTO,
    toSequenceRequestListDTO,
    toStopOrderDTO,
    toStopRefDTO,
    toTripDetailDTO,
    toTripListDTO,
    toTripOrderDTO,
    toTripRefDTO,
    toTripSummaryDTO,
    toVehicleCountsDTO,
    toVehicleTripDTO,
} from "./trips.dto.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const SEQUENCE_EDITABLE_PLAN_STATUSES = ["CLOSED", "DRAFT"];
const DRIVER_CHANGEABLE_TRIP_STATUSES = ["PLANNED", "LOADING", "LOADED"];
const REQUESTABLE_TRIP_STATUSES = ["LOADED", "IN_TRANSIT"];

// ---- route distance and fuel (pure) ----
// One place decides how far a trip drives, so a road-distance source can replace it later.

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// straight-line distance between two { lat, lng } points in km
export const haversineKm = (a, b) => {
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

const pointOf = (place) => {
    if (!place || place.lat === null || place.lat === undefined || place.lng === null || place.lng === undefined) return null;
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

// the district table kept on each outlet (data_files/district_travel.csv)
const districtTravelOf = (outlet) => {
    const attributes = outlet?.sourceAttributes;
    const depotKm = attributes?.depot_to_district_km;
    const interStopKm = attributes?.inter_stop_km;
    if (typeof depotKm !== "number" || typeof interStopKm !== "number") return null;
    return { district: outlet.district, depotKm, interStopKm };
};

// A trip drives depot -> its stops in sequence -> depot.
//   - haversine (straight line) when the depot and every outlet have coordinates;
//   - otherwise the district table: depot legs use depot_to_district_km, a leg inside one
//     district uses inter_stop_km, a leg between two districts uses the difference of their
//     depot distances (the districts are assumed to lie along one corridor);
//   - otherwise not measurable.
// stops: ordered [{ outlet: { district, lat, lng, sourceAttributes } }]
// returns { measurable, distanceKm, legs (km arriving at each stop), method }
export const estimateRouteDistanceKm = ({ depot, stops }) => {
    if (stops.length === 0) return { measurable: true, distanceKm: 0, legs: [], method: null };

    const depotPoint = pointOf(depot);
    const points = stops.map((stop) => pointOf(stop.outlet));
    if (depotPoint && points.every(Boolean)) {
        const route = [depotPoint, ...points, depotPoint];
        const legs = route.slice(1).map((point, index) => roundTo(haversineKm(route[index], point), 2));
        return { measurable: true, distanceKm: roundTo(legs.reduce((a, b) => a + b, 0), 2), legs: legs.slice(0, stops.length), method: "HAVERSINE" };
    }

    const travel = stops.map((stop) => districtTravelOf(stop.outlet));
    if (travel.every(Boolean)) {
        const legs = travel.map((current, index) => {
            if (index === 0) return current.depotKm;
            const previous = travel[index - 1];
            return previous.district === current.district ? current.interStopKm : Math.abs(previous.depotKm - current.depotKm);
        });
        const returnLeg = travel[travel.length - 1].depotKm;
        return {
            measurable: true,
            distanceKm: roundTo(legs.reduce((a, b) => a + b, 0) + returnLeg, 2),
            legs: legs.map((leg) => roundTo(leg, 2)),
            method: "DISTRICT_TABLE",
        };
    }

    return { measurable: false, distanceKm: 0, legs: [], method: null };
};

// distance and fuel of a route for a vehicle; not measurable without a fuel profile
export const estimateTripFuel = ({ depot, stops, fuelKmPerLitre }) => {
    const route = estimateRouteDistanceKm({ depot, stops });
    const kmPerLitre = toNumber(fuelKmPerLitre);
    if (!route.measurable || !(kmPerLitre > 0)) {
        return { measurable: false, distanceKm: 0, fuelL: 0, legs: [], method: null };
    }
    return { measurable: true, distanceKm: route.distanceKm, fuelL: roundTo(route.distanceKm / kmPerLitre, 2), legs: route.legs, method: route.method };
};

// ---- exported to other modules ----

// Recomputes a trip's planned weight, volume, distance and fuel from its stops and allocated orders.
// Distance and fuel stay 0 (and measurable = false is returned) when a coordinate or the fuel profile is missing.
export const recomputeTripTotalsTx = async (tx, tripId) => {
    const trip = await findTripForTotalsTx(tx, tripId);
    if (!trip) throw new AppError("Trip not found.", 404);

    const orders = trip.stops.flatMap((stop) => stop.allocations.map((allocation) => allocation.order));
    const weightKg = orders.reduce((sum, order) => sum + Math.round(Number(order.totalWeightKg) * 100), 0) / 100;
    const volumeM3 = orders.reduce((sum, order) => sum + Math.round(Number(order.totalVolumeM3) * 1000), 0) / 1000;

    const fuel = estimateTripFuel({ depot: trip.plan.depot, stops: trip.stops, fuelKmPerLitre: trip.vehicle.fuelKmPerLitre });

    await updateTripTotalsTx(tx, tripId, {
        plannedWeightKg: weightKg,
        plannedVolumeM3: volumeM3,
        plannedDistanceKm: fuel.distanceKm,
        plannedFuelL: fuel.fuelL,
    });
    await updateStopLegDistancesTx(
        tx,
        trip.stops.map((stop, index) => ({ id: stop.id, legDistanceKm: fuel.measurable ? fuel.legs[index] : null })),
    );

    return { measurable: fuel.measurable, weightKg, volumeM3, distanceKm: fuel.distanceKm, fuelL: fuel.fuelL, method: fuel.method };
};

// a vehicle's trips on a date (fleet detail)
export const listVehicleTripsOnDate = async (vehicleId, date) =>
    (await findVehicleTripsOnDate(vehicleId, fromYmd(date))).map(toVehicleTripDTO);

// vehicles with trips / in transit on a date, for the given depots (null = all)
export const countVehiclesWithTrips = async ({ depotIds, date }) =>
    toVehicleCountsDTO(await countVehiclesWithTripsOnDate({ depotIds, deliveryDate: fromYmd(date) }));

// active vehicles of the depots (null = all) that already have `minTrips` trips on a date
export const countVehiclesAtTripLimit = async ({ depotIds, date, minTrips }) =>
    countVehiclesWithAtLeastTrips({ depotIds, deliveryDate: fromYmd(date), minTrips });

// the allocation engine's view of a depot's day; pass a transaction to read inside it
export const listDepotTripsForDate = async ({ depotId, deliveryDate }, tx) =>
    (await findDepotTripsForDate({ depotId, deliveryDate: fromYmd(deliveryDate) }, tx)).map(toDepotTripDTO);

// Map(vehicleId -> litres) of planned fuel in the ISO week of `date` for trips whose plans are not published
export const getUnpublishedPlannedFuel = async ({ vehicleIds, date }, tx) => {
    if (vehicleIds.length === 0) return new Map();
    const weekStart = mondayOf(date);
    const rows = await sumUnpublishedPlannedFuel(
        { vehicleIds, weekStart: fromYmd(weekStart), weekEnd: fromYmd(addDays(weekStart, 6)) },
        tx,
    );
    return new Map(rows.map((row) => [row.vehicleId, toNumber(row._sum.plannedFuelL) ?? 0]));
};

// trip summaries of a plan (plan detail)
export const listTripSummariesForPlan = async (planId) => (await listTripsOfPlan(planId)).map(toTripSummaryDTO);

// ---- endpoints ----

export const listTripsService = async ({ userId, deliveryDate, depotId, planId, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    if (depotId) assertDepotAccess(scope, depotId);

    const depotFilter = depotId ? depotId : scope.role === Role.ADMIN ? undefined : { in: scope.depotIds };
    const where = {
        ...(depotFilter && { plan: { depotId: depotFilter } }),
        ...(planId && { planId }),
        ...(deliveryDate && { deliveryDate: fromYmd(deliveryDate) }),
    };

    const { rows, total } = await listTrips({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toTripListDTO(rows, { page, pageSize, total });
};

export const getTripService = async ({ userId, id }) => {
    const scope = await usersService.getScope(userId);
    const trip = await findTripDetail(id);
    if (!trip) throw new AppError("Trip not found.", 404);

    if (scope.role === Role.DRIVER) assertTripDriver(scope, { driverId: trip.driver?.id ?? null });
    else assertDepotAccess(scope, trip.plan.depotId);

    return toTripDetailDTO(trip);
};

const stopSetError = (message, details) => new AppError(message, 422, details);

// `provided` must list exactly the `expected` ids, each once
const assertSameStops = (provided, expected, field) => {
    const unique = new Set(provided);
    if (unique.size !== provided.length) {
        throw stopSetError("A stop appears more than once.", [{ field, message: "Each stop must be listed exactly once.", code: "duplicate_stop" }]);
    }
    const wanted = new Set(expected);
    const unknown = provided.filter((stopId) => !wanted.has(stopId));
    const missing = expected.filter((stopId) => !unique.has(stopId));
    if (unknown.length > 0 || missing.length > 0) {
        throw stopSetError("The list must contain every stop of the trip exactly once.", [
            ...unknown.map((stopId) => ({ field, message: `Stop ${stopId} does not belong to this trip.`, code: "unknown_stop" })),
            ...missing.map((stopId) => ({ field, message: `Stop ${stopId} is missing.`, code: "missing_stop" })),
        ]);
    }
};

export const changeSequenceService = async ({ userId, id, stopIds, context }) => {
    const scope = await usersService.getScope(userId);
    const trip = await findTripCore(id);
    if (!trip) throw new AppError("Trip not found.", 404);
    assertDepotAccess(scope, trip.plan.depotId);

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        await lockPlanTx(tx, trip.planId);

        const current = await findTripCore(id, tx);
        if (current.status !== "PLANNED") {
            throw new AppError(`Trip ${current.code} is ${current.status}; stops can only be re-ordered while it is PLANNED.`, 409);
        }
        if (!SEQUENCE_EDITABLE_PLAN_STATUSES.includes(current.plan.status)) {
            throw new AppError("The plan is already published; the stop order can no longer be changed here.", 409);
        }

        const stops = await listTripStopsTx(tx, id);
        assertSameStops(stopIds, stops.map((stop) => stop.id), "stopIds");

        await reorderStopsTx(tx, id, stopIds);
        const totals = await recomputeTripTotalsTx(tx, id);

        await auditService.recordTx(tx, {
            ...context,
            action: "STOP_SEQUENCE_CHANGED",
            entityType: "Trip",
            entityId: id,
            before: { stopIds: stops.map((stop) => stop.id) },
            after: { stopIds, plannedDistanceKm: totals.distanceKm, plannedFuelL: totals.fuelL },
        });
    }, TX_OPTIONS);

    return toTripDetailDTO(await findTripDetail(id));
};

export const changeDriverService = async ({ userId, id, driverId, context }) => {
    const scope = await usersService.getScope(userId);
    const trip = await findTripCore(id);
    if (!trip) throw new AppError("Trip not found.", 404);
    assertDepotAccess(scope, trip.plan.depotId);

    if (!DRIVER_CHANGEABLE_TRIP_STATUSES.includes(trip.status)) {
        throw new AppError(`Trip ${trip.code} is ${trip.status}; its driver can no longer be changed.`, 409);
    }

    const driver = await usersService.getUserService({ id: driverId }).catch((error) => {
        if (error.statusCode === 404) throw new AppError("Driver not found.", 422);
        throw error;
    });
    if (driver.role !== Role.DRIVER || !driver.isActive || !driver.isApproved) {
        throw new AppError("The driver must be an active, approved user with the DRIVER role.", 422);
    }

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        const stops = await listTripStopsTx(tx, id);
        await updateTripDriverTx(tx, id, driverId);

        await auditService.recordTx(tx, {
            ...context,
            action: "TRIP_DRIVER_CHANGED",
            entityType: "Trip",
            entityId: id,
            before: { driverId: trip.driverId },
            after: { driverId },
        });

        if (trip.driverId !== driverId) {
            await notificationsService.notifyUsersTx(
                tx,
                [driverId],
                notificationsService.buildRouteAssignedNotification({
                    tripId: id,
                    tripCode: trip.code,
                    deliveryDate: toYmd(trip.plan.deliveryDate),
                    stopCount: stops.length,
                }),
            );
        }
    }, TX_OPTIONS);

    return toTripDetailDTO(await findTripDetail(id));
};

// ---- driver sequence-change requests ----

export const createSequenceRequestService = async ({ userId, id, proposedStopIds, reason }) => {
    const scope = await usersService.getScope(userId);
    const trip = await findTripDetail(id);
    if (!trip) throw new AppError("Trip not found.", 404);
    assertTripDriver(scope, { driverId: trip.driver?.id ?? null });

    if (!REQUESTABLE_TRIP_STATUSES.includes(trip.status)) {
        throw new AppError(`Trip ${trip.code} is ${trip.status}; stop order changes can only be requested once it is loaded or on the road.`, 409);
    }

    const pendingStopIds = trip.stops.filter((stop) => stop.status === "PENDING").map((stop) => stop.id);
    assertSameStops(proposedStopIds, pendingStopIds, "proposedStopIds");

    const dispatchers = await notificationsService.usersOfDepot(trip.plan.depotId, Role.DISPATCHER);
    const driver = await usersService.getUserProfile(userId);

    const db = getPrisma();
    const created = await db.$transaction(async (tx) => {
        await lockPlanTx(tx, trip.planId);
        // only one open request per trip (checked inside the lock so two requests cannot both pass)
        if (await findPendingSequenceRequest(id, tx)) {
            throw new AppError("This trip already has a pending stop order request.", 409);
        }

        const request = await createSequenceRequestTx(tx, {
            tripId: id,
            requestedById: userId,
            proposedSequence: proposedStopIds,
            reason: reason ?? null,
        });

        await notificationsService.notifyUsersTx(
            tx,
            dispatchers,
            notificationsService.buildSequenceChangeRequestedNotification({
                requestId: request.id,
                tripCode: trip.code,
                driverName: driver.fullName,
            }),
        );
        return request;
    }, TX_OPTIONS);

    return toSequenceRequestDTO(created);
};

export const listSequenceRequestsService = async ({ userId, id, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    const trip = await findTripCore(id);
    if (!trip) throw new AppError("Trip not found.", 404);

    if (scope.role === Role.DRIVER) assertTripDriver(scope, { driverId: trip.driverId });
    else assertDepotAccess(scope, trip.plan.depotId);

    const { rows, total } = await listSequenceRequests({ where: { tripId: id }, skip: (page - 1) * pageSize, take: pageSize });
    return toSequenceRequestListDTO(rows, { page, pageSize, total });
};

export const decideSequenceRequestService = async ({ userId, requestId, decision, context }) => {
    const scope = await usersService.getScope(userId);
    const request = await findSequenceRequestById(requestId);
    if (!request) throw new AppError("Sequence request not found.", 404);
    assertDepotAccess(scope, request.trip.plan.depotId);

    if (request.status !== "PENDING") {
        throw new AppError(`This request was already ${request.status.toLowerCase()}.`, 409);
    }

    const planId = (await findTripCore(request.tripId)).planId;

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        await lockPlanTx(tx, planId);

        const { count } = await decideSequenceRequestTx(tx, { id: requestId, status: decision, decidedById: userId });
        if (count !== 1) throw new AppError("This request was already decided.", 409);

        if (decision === "APPROVED") {
            // stops that are no longer pending keep their place at the front; the rest follow the driver's order
            const stops = await listTripStopsTx(tx, request.tripId);
            const stillPending = new Set(stops.filter((stop) => stop.status === "PENDING").map((stop) => stop.id));
            const frozen = stops.filter((stop) => !stillPending.has(stop.id)).map((stop) => stop.id);
            const proposed = request.proposedSequence.filter((stopId) => stillPending.has(stopId));
            const leftover = stops.filter((stop) => stillPending.has(stop.id) && !proposed.includes(stop.id)).map((stop) => stop.id);

            const finalOrder = [...frozen, ...proposed, ...leftover];
            if (finalOrder.some((stopId, index) => stopId !== stops[index].id)) {
                await reorderStopsTx(tx, request.tripId, finalOrder);
            }
        }

        await notificationsService.notifyUsersTx(
            tx,
            [request.requestedById],
            notificationsService.buildSequenceRequestDecidedNotification({ requestId, tripCode: request.trip.code, decision }),
        );

        await auditService.recordTx(tx, {
            ...context,
            action: "SEQUENCE_REQUEST_DECIDED",
            entityType: "SequenceChangeRequest",
            entityId: requestId,
            before: { status: "PENDING" },
            after: { status: decision, tripId: request.tripId },
        });
    }, TX_OPTIONS);

    return toSequenceRequestDTO(await findSequenceRequestById(requestId));
};

// ---- prompt 3: trip status machine and lookups for loading, deliveries and issues ----

// The only place that knows which trip status may follow which. Every trip status change goes through
// transitionTripTx. (Cancelling a trip is allowed here but no endpoint uses it yet.)
const TRIP_TRANSITIONS = {
    PLANNED: ["LOADING", "CANCELLED"],
    LOADING: ["LOADED", "CANCELLED"],
    LOADED: ["IN_TRANSIT", "CANCELLED"],
    IN_TRANSIT: ["COMPLETED"],
};

// Moves a trip to a new status inside the caller's transaction. IN_TRANSIT stamps actualDeparture and
// COMPLETED stamps actualReturn with `at` (default: now). An invalid move is a 409 that names the current
// and the requested status. Returns { id, code, planId, fromStatus, toStatus }.
export const transitionTripTx = async (tx, { tripId, toStatus, at = new Date() }) => {
    const trip = await findTripStatusTx(tx, tripId);
    if (!trip) throw new AppError("Trip not found.", 404);

    const invalid = (currentStatus) =>
        new AppError(`Trip ${trip.code} is ${currentStatus} and cannot be changed to ${toStatus}.`, 409, [
            { tripId, code: trip.code, currentStatus, requestedStatus: toStatus },
        ]);
    if (!(TRIP_TRANSITIONS[trip.status] ?? []).includes(toStatus)) throw invalid(trip.status);

    const { count } = await updateTripStatusTx(tx, tripId, trip.status, {
        status: toStatus,
        ...(toStatus === "IN_TRANSIT" && { actualDeparture: at }),
        ...(toStatus === "COMPLETED" && { actualReturn: at }),
    });
    if (count !== 1) throw invalid("changed by another request");

    return { id: trip.id, code: trip.code, planId: trip.planId, fromStatus: trip.status, toStatus };
};

// A trip with its plan and depot (404 when missing). Pass a transaction to read inside it.
export const getTripRef = async (tripId, tx) => {
    const trip = await findTripRef(tripId, tx);
    if (!trip) throw new AppError("Trip not found.", 404);
    return toTripRefDTO(trip);
};

// A stop with its outlet, status, timestamps and trip (404 when missing).
export const getStopRef = async (stopId, tx) => {
    const stop = await findStopRef(stopId, tx);
    if (!stop) throw new AppError("Stop not found.", 404);
    return toStopRefDTO(stop);
};

// Another trip of this vehicle that is on the road, as { id, code }, or null.
export const findVehicleTripOnRoad = async ({ vehicleId, excludeTripId }, tx) =>
    (await findVehicleTripInTransit({ vehicleId, excludeTripId }, tx)) ?? null;

// [{ stopId, orderId, reference, status, outletId }] for every order of a trip.
export const listTripOrdersTx = async (tx, tripId) => (await findTripOrdersTx(tx, tripId)).map(toTripOrderDTO);

// The orders at one stop, each with its lines.
export const listStopOrdersTx = async (tx, stopId) => (await findStopOrdersWithItemsTx(tx, stopId)).map(toStopOrderDTO);

// Which stop status may follow which. A stop is final once it is COMPLETED, PARTIAL, FAILED or SKIPPED.
const STOP_TRANSITIONS = {
    PENDING: ["ARRIVED", "FAILED", "SKIPPED"],
    ARRIVED: ["UNLOADING", "FAILED", "COMPLETED", "PARTIAL"],
    UNLOADING: ["FAILED", "COMPLETED", "PARTIAL"],
};
const FINAL_STOP_STATUSES = ["COMPLETED", "PARTIAL", "FAILED", "SKIPPED"];

// Moves a stop to a new status inside the caller's transaction and writes `data` (timestamps, reason)
// with it. Compare-and-set: a stop that is not in a status that may precede toStatus is a 409 naming
// its current status.
export const transitionStopTx = async (tx, { stopId, toStatus, data = {} }) => {
    const fromStatuses = Object.entries(STOP_TRANSITIONS)
        .filter(([, next]) => next.includes(toStatus))
        .map(([from]) => from);

    const { count } = await updateStopStatusTx(tx, { id: stopId, fromStatuses, data: { status: toStatus, ...data } });
    if (count === 1) return;

    const stop = await findStopRef(stopId, tx);
    if (!stop) throw new AppError("Stop not found.", 404);
    throw new AppError(`The stop is ${stop.status} and cannot be changed to ${toStatus}.`, 409, [
        { stopId, currentStatus: stop.status, requestedStatus: toStatus },
    ]);
};

// Completes the trip (IN_TRANSIT -> COMPLETED, stamping actualReturn with `at`) once all its stops are
// final. The plan lock makes two stops that finish at the same time see each other's result.
// Returns { id, code, planId } when the trip was completed, otherwise null.
export const completeTripIfAllStopsFinalTx = async (tx, { tripId, planId, at = new Date() }) => {
    await lockPlanTx(tx, planId);

    const stops = await listTripStopStatusesTx(tx, tripId);
    if (stops.length === 0 || stops.some((stop) => !FINAL_STOP_STATUSES.includes(stop.status))) return null;

    return transitionTripTx(tx, { tripId, toStatus: "COMPLETED", at });
};
