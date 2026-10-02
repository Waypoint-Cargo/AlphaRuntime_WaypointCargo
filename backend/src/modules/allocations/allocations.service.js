import { AppError } from "../../utils/appError.js";
import { OrderStatus } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { businessMinutesOfDay, fromYmd, minutesToHHMM, mondayOf } from "../../utils/businessTime.js";
import { roundTo, toNumber } from "../../utils/serialize.js";
import * as usersService from "../users/users.service.js";
import * as settingsService from "../settings/settings.service.js";
import * as referenceService from "../reference/reference.service.js";
import * as fleetService from "../fleet/fleet.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as tripsService from "../trips/trips.service.js";
import * as auditService from "../audit/audit.service.js";
// Transactions here span several modules (plan lock, trips/stops, deferrals, allocations),
// so their Tx repository functions are used directly.
import { findPlanByDepotDate, findPlanById, lockPlanTx, markPlanDraftTx } from "../plans/plans.repository.js";
import {
    createStopTx,
    createTripTx,
    deleteStopTx,
    deleteTripTx,
    findTripBySlotTx,
    listTripStopsTx,
    nextTripNumberTx,
    reorderStopsTx,
} from "../trips/trips.repository.js";
import { findOutletDeferralOnDateTx, markDeferralServedTx } from "../deferrals/deferrals.repository.js";
import {
    countStopAllocationsTx,
    createAllocationTx,
    deleteAllocationTx,
    findAllocationByOrderTx,
} from "./allocations.repository.js";
import {
    toAllocationDTO,
    toUnallocationDTO,
    toValidationDTO,
    toVehicleOptionsDTO,
} from "./allocations.dto.js";

// allocating touches many rows (trip, stop, allocation, order, plan, audit): give it room
const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

export const MAX_TRIPS_PER_DAY = 2;
const PLAN_OPEN_FOR_ALLOCATION = ["CLOSED", "DRAFT"];
const ALLOCATABLE_ORDER_STATUSES = [OrderStatus.CONFIRMED, OrderStatus.DEFERRED];

// ---- the rules (pure) ----

const makeCheck = (code, label, status, value, limit, message) => ({ code, label, status, value, limit, message });
const verdictOf = (checks) =>
    checks.some((check) => check.status === "FAIL") ? "FAIL" : checks.some((check) => check.status === "WARN") ? "WARN" : "PASS";

// Can this order go on this vehicle's trip? Plain data in, plain data out; no Prisma.
// input: {
//   order:   { depotId, deliveryDate, tempClass, weightKg, volumeM3, vanOnly, isMall,
//              window: {startMin,endMin}|null, mallAccessWindow: {startMin,endMin}|null },
//   vehicle: { homeDepotId, isActive, isRefrigerated, type, maxWeightKg, maxVolumeM3 },
//   tripNumber, tripLoad: { weightKg, volumeM3 },        // what is already on the trip
//   isOperatingDay,
//   fuel: { remainingL, additionalL, measurable },
//   nearCapacityThreshold,
//   deferredPreviousDay,                                  // the outlet was deferred on the previous operating day
//   predictedArrival: Date | null                         // the stop's predicted arrival, if any
// }
// -> { verdict: "PASS" | "WARN" | "FAIL", checks: [{ code, label, status, value, limit, message }] }
// FAIL checks can never be overridden; WARN checks can be accepted by the dispatcher.
export const evaluateAllocation = (input) => {
    const { order, vehicle, tripNumber, tripLoad, isOperatingDay, fuel, nearCapacityThreshold, deferredPreviousDay, predictedArrival } = input;
    const needsCold = order.tempClass === "CHILLED" || order.tempClass === "FROZEN";
    const weightAfter = roundTo(tripLoad.weightKg + order.weightKg, 2);
    const volumeAfter = roundTo(tripLoad.volumeM3 + order.volumeM3, 3);
    const checks = [];

    // ---- FAIL checks ----
    const sameDepot = vehicle.homeDepotId === order.depotId;
    checks.push(
        makeCheck("DEPOT", "Depot", sameDepot ? "PASS" : "FAIL", vehicle.homeDepotId, order.depotId,
            sameDepot ? "The vehicle operates from the order's depot." : "The vehicle belongs to a different depot than the order."),
    );

    checks.push(
        makeCheck("OPERATING_DAY", "Operating day", isOperatingDay ? "PASS" : "FAIL", order.deliveryDate, "operating day",
            isOperatingDay ? `${order.deliveryDate} is an operating day.` : `Waypoint does not deliver on ${order.deliveryDate}.`),
    );

    const tripOk = Number.isInteger(tripNumber) && tripNumber >= 1 && tripNumber <= MAX_TRIPS_PER_DAY;
    checks.push(
        makeCheck("TRIP_LIMIT", "Trips per day", tripOk ? "PASS" : "FAIL", tripNumber, MAX_TRIPS_PER_DAY,
            tripOk ? `Trip ${tripNumber} of at most ${MAX_TRIPS_PER_DAY} per vehicle and day.` : `A vehicle can run at most ${MAX_TRIPS_PER_DAY} trips per day.`),
    );

    checks.push(
        makeCheck("VEHICLE_ACTIVE", "Vehicle active", vehicle.isActive ? "PASS" : "FAIL", vehicle.isActive, true,
            vehicle.isActive ? "The vehicle is active." : "The vehicle is not active."),
    );

    const temperatureOk = !needsCold || vehicle.isRefrigerated;
    checks.push(
        makeCheck("TEMPERATURE", "Temperature", temperatureOk ? "PASS" : "FAIL", order.tempClass,
            vehicle.isRefrigerated ? "refrigerated" : "ambient only",
            temperatureOk
                ? vehicle.isRefrigerated ? "The vehicle is refrigerated." : "Ambient goods can travel in a dry vehicle."
                : `No cold storage: ${order.tempClass.toLowerCase()} goods need a refrigerated vehicle.`),
    );

    const vanOk = !order.vanOnly || vehicle.type === "VAN";
    checks.push(
        makeCheck("VAN_ONLY", "Van-only outlet", vanOk ? "PASS" : "FAIL", vehicle.type, order.vanOnly ? "VAN" : "any",
            vanOk ? (order.vanOnly ? "The outlet needs a van and this is a van." : "The outlet has no vehicle-type restriction.")
                  : "This outlet can only be served by a van."),
    );

    const weightOk = weightAfter <= vehicle.maxWeightKg;
    checks.push(
        makeCheck("WEIGHT", "Weight", weightOk ? "PASS" : "FAIL", weightAfter, vehicle.maxWeightKg,
            weightOk ? `${weightAfter} kg of ${vehicle.maxWeightKg} kg.` : `The trip would carry ${weightAfter} kg; the vehicle's limit is ${vehicle.maxWeightKg} kg.`),
    );

    const volumeOk = volumeAfter <= vehicle.maxVolumeM3;
    checks.push(
        makeCheck("VOLUME", "Volume", volumeOk ? "PASS" : "FAIL", volumeAfter, vehicle.maxVolumeM3,
            volumeOk ? `${volumeAfter} m³ of ${vehicle.maxVolumeM3} m³.` : `The trip would carry ${volumeAfter} m³; the vehicle's limit is ${vehicle.maxVolumeM3} m³.`),
    );

    if (fuel.measurable) {
        const additionalL = roundTo(fuel.additionalL, 2);
        const remainingL = roundTo(fuel.remainingL, 2);
        const fuelOk = additionalL <= remainingL;
        checks.push(
            makeCheck("FUEL_QUOTA", "Weekly fuel quota", fuelOk ? "PASS" : "FAIL", additionalL, remainingL,
                fuelOk ? `${additionalL} L needed, ${remainingL} L left this week.` : `${additionalL} L needed but only ${remainingL} L of the weekly quota is left.`),
        );
    }

    // ---- WARN checks ----
    const utilisation = roundTo(Math.max(weightAfter / vehicle.maxWeightKg, volumeAfter / vehicle.maxVolumeM3), 3);
    const nearCapacity = utilisation > nearCapacityThreshold;
    checks.push(
        makeCheck("NEAR_CAPACITY", "Near capacity", nearCapacity ? "WARN" : "PASS", utilisation, nearCapacityThreshold,
            nearCapacity ? `The trip would be ${Math.round(utilisation * 100)}% full (threshold ${Math.round(nearCapacityThreshold * 100)}%).` : `${Math.round(utilisation * 100)}% full.`),
    );

    if (!fuel.measurable) {
        checks.push(
            makeCheck("FUEL_NOT_MEASURABLE", "Fuel estimate", "WARN", null, null,
                "Fuel use cannot be estimated for this trip, so the weekly quota is not checked."),
        );
    }

    const window = order.isMall ? (order.mallAccessWindow ?? order.window) : order.window;
    if (!predictedArrival) {
        checks.push(makeCheck("DELIVERY_WINDOW", "Delivery window", "WARN", null, window ? `${window.start}-${window.end}` : null, "Arrival time not estimated."));
    } else if (window) {
        const arrival = businessMinutesOfDay(predictedArrival);
        const inside = arrival >= window.startMin && arrival <= window.endMin;
        checks.push(
            makeCheck("DELIVERY_WINDOW", "Delivery window", inside ? "PASS" : "WARN", minutesToHHMM(arrival), `${window.start}-${window.end}`,
                inside ? `Predicted arrival ${minutesToHHMM(arrival)} is inside ${window.start}-${window.end}.`
                       : `Predicted arrival ${minutesToHHMM(arrival)} is outside the ${order.isMall ? "mall access" : "delivery"} window ${window.start}-${window.end}.`),
        );
    }

    checks.push(
        makeCheck("REPEAT_DEFERRAL", "Repeat deferral", deferredPreviousDay ? "WARN" : "PASS", deferredPreviousDay, false,
            deferredPreviousDay ? "This outlet was already deferred on the previous operating day." : "Not deferred on the previous operating day."),
    );

    return { verdict: verdictOf(checks), checks };
};

// ---- planning context (everything the rules need, loaded once per order) ----

const notClosed = () => new AppError("Orders are not closed for this date.", 409);

const assertPlanOpenForAllocation = (plan) => {
    if (!plan || plan.status === "OPEN") throw notClosed();
    if (!PLAN_OPEN_FOR_ALLOCATION.includes(plan.status)) throw new AppError("The plan is already published.", 409);
};

const assertAllocatable = (order) => {
    if (!ALLOCATABLE_ORDER_STATUSES.includes(order.status)) {
        throw new AppError(`Order ${order.reference} is ${order.status}; only confirmed or deferred orders can be allocated.`, 409);
    }
    if (order.isAllocated) throw new AppError(`Order ${order.reference} is already allocated.`, 409);
};

const attachVehicleFuel = async (ctx, vehicles, tx) => {
    const fuel = await fleetService.getWeeklyFuelForVehicles(vehicles, ctx.weekStart);
    const unpublished = await tripsService.getUnpublishedPlannedFuel({ vehicleIds: vehicles.map((vehicle) => vehicle.id), date: ctx.order.deliveryDate }, tx);
    for (const [vehicleId, row] of fuel) ctx.fuelByVehicle.set(vehicleId, row);
    for (const [vehicleId, litres] of unpublished) ctx.unpublishedByVehicle.set(vehicleId, litres);
};

// reads go through `tx` so that changes made earlier in the same transaction are visible
const loadContext = async ({ order, tx }) => {
    const deliveryDate = order.deliveryDate;
    const outlet = await referenceService.getOutlet(order.outletId);
    const outletRouting = await referenceService.getOutletRouting(order.outletId);
    const isOperatingDay = await referenceService.isOperatingDate(deliveryDate);
    const nearCapacityThreshold = await settingsService.getSetting("near_capacity_threshold");
    const plan = await findPlanByDepotDate({ depotId: order.depotId, deliveryDate: fromYmd(deliveryDate) }, tx);
    const vehicles = await fleetService.listActiveDepotVehicles(order.depotId, tx);
    const trips = await tripsService.listDepotTripsForDate({ depotId: order.depotId, deliveryDate }, tx);

    let deferredPreviousDay = false;
    try {
        const previousDate = await referenceService.previousOperatingDate(deliveryDate);
        deferredPreviousDay = Boolean(await findOutletDeferralOnDateTx(tx, { outletId: order.outletId, fromDate: fromYmd(previousDate) }));
    } catch (error) {
        if (error.statusCode !== 422) throw error; // no earlier operating day in the calendar
    }

    const ctx = {
        order: { ...order, isMall: Boolean(outlet.isMall), mallAccessWindow: outlet.mallAccessWindow, window: order.window ?? outlet.window },
        outletRouting,
        isOperatingDay,
        nearCapacityThreshold,
        plan,
        vehicles,
        tripBySlot: new Map(trips.map((trip) => [`${trip.vehicleId}:${trip.tripNumber}`, trip])),
        weekStart: mondayOf(deliveryDate),
        fuelByVehicle: new Map(),
        unpublishedByVehicle: new Map(),
        deferredPreviousDay,
    };
    await attachVehicleFuel(ctx, vehicles, tx);
    return ctx;
};

// The fuel position of putting this order on that vehicle's trip.
const candidateFuel = (ctx, vehicle, trip, hasStop) => {
    const weekly = ctx.fuelByVehicle.get(vehicle.id);
    const quotaLeft = weekly ? weekly.remainingL : vehicle.weeklyFuelQuotaL;
    const remainingL = quotaLeft - (ctx.unpublishedByVehicle.get(vehicle.id) ?? 0);
    if (hasStop) return { remainingL, additionalL: 0, measurable: true }; // the stop is already on the route

    const depot = trip?.depot ?? ctx.plan?.depot ?? null;
    const currentStops = trip?.stops ?? [];
    const after = tripsService.estimateTripFuel({ depot, stops: [...currentStops, { outlet: ctx.outletRouting }], fuelKmPerLitre: vehicle.fuelKmPerLitre });
    if (!after.measurable) return { remainingL, additionalL: 0, measurable: false };

    const before = tripsService.estimateTripFuel({ depot, stops: currentStops, fuelKmPerLitre: vehicle.fuelKmPerLitre });
    return { remainingL, additionalL: roundTo(after.fuelL - (before.measurable ? before.fuelL : 0), 2), measurable: true };
};

const describeReasons = (ctx, vehicle, option) => {
    const reasons = [];
    if (option.hasStopForOutlet) reasons.push("Already delivering to this outlet on this trip.");
    else if (option.trip) reasons.push(`Trip already planned (${option.trip.stops.length} ${option.trip.stops.length === 1 ? "stop" : "stops"}).`);
    else reasons.push("Starts a new trip.");
    if (ctx.order.tempClass === "AMBIENT" && !vehicle.isRefrigerated) reasons.push("Keeps refrigerated capacity free for chilled goods.");
    if (ctx.order.tempClass === "AMBIENT" && vehicle.isRefrigerated) reasons.push("Uses scarce refrigerated capacity for ambient goods.");
    reasons.push(`Remaining capacity ${roundTo(option.remaining.weightKg, 0)} kg / ${roundTo(option.remaining.volumeM3, 1)} m³.`);
    if (option.tripNumber === 2) reasons.push("Second trip of the day.");
    for (const check of option.checks) if (check.status === "WARN") reasons.push(check.message);
    return reasons;
};

// one vehicle + trip slot against the order
const evaluateCandidate = (ctx, vehicle, tripNumber) => {
    const trip = ctx.tripBySlot.get(`${vehicle.id}:${tripNumber}`) ?? null;
    const stop = trip?.stops.find((candidate) => candidate.outletId === ctx.order.outletId) ?? null;
    const tripLoad = { weightKg: trip?.plannedWeightKg ?? 0, volumeM3: trip?.plannedVolumeM3 ?? 0 };

    const { verdict, checks } = evaluateAllocation({
        order: ctx.order,
        vehicle,
        tripNumber,
        tripLoad,
        isOperatingDay: ctx.isOperatingDay,
        fuel: candidateFuel(ctx, vehicle, trip, Boolean(stop)),
        nearCapacityThreshold: ctx.nearCapacityThreshold,
        deferredPreviousDay: ctx.deferredPreviousDay,
        predictedArrival: stop?.predictedArrival ?? null,
    });

    const option = {
        vehicle,
        tripNumber,
        trip,
        stop,
        hasStopForOutlet: Boolean(stop),
        verdict,
        checks,
        remaining: { weightKg: vehicle.maxWeightKg - tripLoad.weightKg, volumeM3: vehicle.maxVolumeM3 - tripLoad.volumeM3 },
    };
    option.reasons = describeReasons(ctx, vehicle, option);
    return option;
};

const evaluateAllOptions = (ctx) =>
    ctx.vehicles.flatMap((vehicle) => [1, 2].map((tripNumber) => evaluateCandidate(ctx, vehicle, tripNumber)));

const warnCount = (option) => option.checks.filter((check) => check.status === "WARN").length;

// consolidating onto an existing stop, then onto an existing trip, beats opening a new one
const consolidationRank = (option) => (option.hasStopForOutlet ? 0 : option.trip ? 1 : 2);

const RECOMMENDED = (order) => (a, b) =>
    warnCount(a) - warnCount(b) ||
    // keep refrigerated capacity (16 of 60 vehicles) for chilled and frozen goods
    (order.tempClass === "AMBIENT" ? Number(a.vehicle.isRefrigerated) - Number(b.vehicle.isRefrigerated) : 0) ||
    consolidationRank(a) - consolidationRank(b) ||
    b.remaining.weightKg - a.remaining.weightKg ||
    a.tripNumber - b.tripNumber ||
    a.vehicle.code.localeCompare(b.vehicle.code);

const BY_CAPACITY = (a, b) =>
    b.remaining.weightKg - a.remaining.weightKg ||
    b.remaining.volumeM3 - a.remaining.volumeM3 ||
    a.vehicle.code.localeCompare(b.vehicle.code) ||
    a.tripNumber - b.tripNumber;

// Loads the order inside `tx`, checks the dispatcher may work on it and that planning is possible.
const loadOrderForPlanning = async ({ tx, scope, orderId }) => {
    const order = await ordersService.getOrderForAllocation(orderId, tx);
    assertDepotAccess(scope, order.depotId);
    assertAllocatable(order);
    return order;
};

// ---- endpoints ----

export const getVehicleOptionsService = async ({ userId, orderId, sort }) => {
    const scope = await usersService.getScope(userId);
    const db = getPrisma();

    return db.$transaction(async (tx) => {
        const order = await loadOrderForPlanning({ tx, scope, orderId });
        const ctx = await loadContext({ order, tx });
        assertPlanOpenForAllocation(ctx.plan);

        const options = evaluateAllOptions(ctx);
        const feasible = options.filter((option) => option.verdict !== "FAIL").sort(sort === "capacity" ? BY_CAPACITY : RECOMMENDED(ctx.order));
        const blocked = options.filter((option) => option.verdict === "FAIL").sort(BY_CAPACITY);

        return toVehicleOptionsDTO({ order, plan: ctx.plan, sort, feasible, blocked });
    });
};

export const validateAllocationService = async ({ userId, orderId, vehicleId, tripNumber }) => {
    const scope = await usersService.getScope(userId);
    const db = getPrisma();

    return db.$transaction(async (tx) => {
        const order = await loadOrderForPlanning({ tx, scope, orderId });
        const vehicle = await fleetService.getVehicle(vehicleId);
        const ctx = await loadContext({ order, tx });
        assertPlanOpenForAllocation(ctx.plan);
        await attachVehicleFuel(ctx, [vehicle], tx);

        const { verdict, checks } = evaluateCandidate(ctx, vehicle, tripNumber);
        return toValidationDTO({ orderId, vehicleId, tripNumber, verdict, checks });
    });
};

export const allocateOrderService = async ({ userId, orderId, vehicleId, tripNumber, position, acknowledgeWarnings, context }) => {
    const scope = await usersService.getScope(userId);
    const db = getPrisma();

    return db.$transaction(async (tx) => {
        // 1. the plan of the order's depot and date, locked for the rest of the transaction
        const preview = await ordersService.getOrderForAllocation(orderId, tx);
        assertDepotAccess(scope, preview.depotId);
        const planPreview = await findPlanByDepotDate({ depotId: preview.depotId, deliveryDate: fromYmd(preview.deliveryDate) }, tx);
        if (!planPreview) throw notClosed();
        await lockPlanTx(tx, planPreview.id);

        // everything is read again after the lock: another dispatcher may have changed it while we waited
        const order = await ordersService.getOrderForAllocation(orderId, tx);
        if (order.deliveryDate !== preview.deliveryDate) throw new AppError("The order was moved to another date. Reload and try again.", 409);
        const plan = await findPlanById(planPreview.id, tx);
        assertPlanOpenForAllocation(plan);

        // 2. the order must be waiting and not allocated yet
        assertAllocatable(order);

        // 3. re-run the checks inside the transaction
        const vehicle = await fleetService.getVehicle(vehicleId);
        const ctx = await loadContext({ order, tx });
        await attachVehicleFuel(ctx, [vehicle], tx);
        const candidate = evaluateCandidate(ctx, vehicle, tripNumber);

        if (candidate.verdict === "FAIL") {
            const failed = candidate.checks.filter((check) => check.status === "FAIL");
            throw new AppError(`The order cannot be allocated: ${failed.map((check) => check.message).join(" ")}`, 422, {
                code: "ALLOCATION_BLOCKED",
                verdict: candidate.verdict,
                checks: candidate.checks,
            });
        }
        const warnings = candidate.checks.filter((check) => check.status === "WARN");
        const missing = warnings.filter((check) => !acknowledgeWarnings.includes(check.code)).map((check) => check.code);
        if (missing.length > 0) {
            throw new AppError("Warnings must be acknowledged before allocating.", 422, {
                code: "WARNINGS_NOT_ACKNOWLEDGED",
                missing,
                verdict: candidate.verdict,
                checks: candidate.checks,
            });
        }

        // 4. find or create the trip
        let trip = candidate.trip ? { id: candidate.trip.id, code: candidate.trip.code } : await findTripBySlotTx(tx, { vehicleId, deliveryDate: fromYmd(order.deliveryDate), tripNumber });
        let createdTrip = false;
        if (!trip) {
            const code = `R-${String(await nextTripNumberTx(tx)).padStart(3, "0")}`;
            trip = await createTripTx(tx, {
                code,
                planId: plan.id,
                vehicleId,
                driverId: vehicle.defaultDriver?.id ?? null,
                deliveryDate: fromYmd(order.deliveryDate),
                tripNumber,
            });
            createdTrip = true;
        }

        // 5. find or create the stop for the order's outlet
        let stop = candidate.stop ? { id: candidate.stop.id, sequence: candidate.stop.sequence } : null;
        let createdStop = false;
        if (!stop) {
            const stops = createdTrip ? [] : await listTripStopsTx(tx, trip.id);
            const target = position ? Math.min(position, stops.length + 1) : stops.length + 1;
            if (target === stops.length + 1) {
                stop = await createStopTx(tx, { tripId: trip.id, outletId: order.outletId, sequence: target });
            } else {
                // insert in the middle: park the new stop, then renumber everything in two passes
                const parked = await createStopTx(tx, { tripId: trip.id, outletId: order.outletId });
                const ids = stops.map((existing) => existing.id);
                ids.splice(target - 1, 0, parked.id);
                await reorderStopsTx(tx, trip.id, ids);
                stop = { id: parked.id, sequence: target };
            }
            createdStop = true;
        }

        // 6. the allocation itself, then the trip's totals
        await createAllocationTx(tx, {
            orderId,
            stopId: stop.id,
            allocatedById: userId,
            ...(warnings.length > 0 && { warningsAcknowledged: warnings.map((check) => ({ code: check.code, message: check.message })) }),
        });
        const totals = await tripsService.recomputeTripTotalsTx(tx, trip.id);

        // 7. the order is planned; a deferral that brought it here is served
        await ordersService.transitionOrdersTx(tx, {
            orderIds: [orderId],
            toStatus: OrderStatus.PLANNED,
            actorId: userId,
            data: { tripId: trip.id, vehicleId, tripNumber },
        });
        await markDeferralServedTx(tx, { orderId, date: fromYmd(order.deliveryDate) });

        // 8. the plan is now a draft with a new version
        await markPlanDraftTx(tx, plan.id);

        const tripCode = candidate.trip?.code ?? trip.code;
        await auditService.recordTx(tx, {
            ...context,
            action: "ORDER_ALLOCATED",
            entityType: "Order",
            entityId: orderId,
            before: { status: order.status },
            after: {
                status: "PLANNED",
                tripId: trip.id,
                tripCode,
                tripNumber,
                vehicleCode: vehicle.code,
                stopSequence: stop.sequence,
                acknowledgedWarnings: warnings.map((check) => check.code),
            },
        });

        return toAllocationDTO({
            order,
            trip: { id: trip.id, code: tripCode, tripNumber },
            vehicle,
            stop,
            checks: candidate.checks,
            acknowledged: warnings.map((check) => check.code),
            totals,
            createdTrip,
            createdStop,
        });
    }, TX_OPTIONS);
};

// Removes an order from its trip inside the caller's transaction (also used by deferrals).
// The plan must still be CLOSED or DRAFT. The stop goes if nothing else is delivered there
// (the gap in the sequence is closed), the trip goes if it has no stops left, the order is CONFIRMED again.
export const unallocateOrderTx = async (tx, { orderId, context, reason }) => {
    const found = await findAllocationByOrderTx(tx, orderId);
    if (!found) throw new AppError("This order is not allocated.", 409);

    await lockPlanTx(tx, found.stop.trip.planId);
    const allocation = await findAllocationByOrderTx(tx, orderId); // read again under the lock
    if (!allocation) throw new AppError("This order is not allocated.", 409);
    const { trip } = allocation.stop;
    if (!PLAN_OPEN_FOR_ALLOCATION.includes(trip.plan.status)) throw new AppError("The plan is already published.", 409);

    await deleteAllocationTx(tx, allocation.id);

    let tripDeleted = false;
    if ((await countStopAllocationsTx(tx, allocation.stopId)) === 0) {
        await deleteStopTx(tx, allocation.stopId);
        const stops = await listTripStopsTx(tx, trip.id);
        if (stops.length === 0) {
            await deleteTripTx(tx, trip.id);
            tripDeleted = true;
        } else {
            await reorderStopsTx(tx, trip.id, stops.map((stop) => stop.id)); // close the gap
            await tripsService.recomputeTripTotalsTx(tx, trip.id);
        }
    } else {
        await tripsService.recomputeTripTotalsTx(tx, trip.id);
    }

    await ordersService.transitionOrdersTx(tx, {
        orderIds: [orderId],
        toStatus: OrderStatus.CONFIRMED,
        actorId: context.actorId,
        reason: reason ?? "Removed from the plan",
    });

    await auditService.recordTx(tx, {
        ...context,
        action: "ORDER_UNALLOCATED",
        entityType: "Order",
        entityId: orderId,
        before: { status: "PLANNED", tripCode: trip.code, tripNumber: trip.tripNumber },
        after: { status: "CONFIRMED", tripDeleted },
    });

    return { tripId: trip.id, tripCode: trip.code, tripDeleted };
};

export const unallocateOrderService = async ({ userId, orderId, context }) => {
    const scope = await usersService.getScope(userId);
    const db = getPrisma();

    return db.$transaction(async (tx) => {
        const order = await ordersService.getOrderForAllocation(orderId, tx);
        assertDepotAccess(scope, order.depotId);
        const result = await unallocateOrderTx(tx, { orderId, context });
        return toUnallocationDTO({ order, ...result });
    }, TX_OPTIONS);
};

// Why this order cannot be placed: the unique FAIL reasons across every active vehicle and trip slot
// of its depot. Reads inside `tx` when given. The order must NOT be allocated at the moment
// (otherwise its own load would count against it) - callers unallocate first.
export const explainUnallocatable = async (orderId, tx) => {
    const run = async (client) => {
        const order = await ordersService.getOrderForAllocation(orderId, client);
        const ctx = await loadContext({ order, tx: client });

        if (ctx.vehicles.length === 0) {
            return [{ code: "NO_ACTIVE_VEHICLE", label: "No active vehicle", message: "The depot has no active vehicles.", occurrences: 0 }];
        }

        const reasons = new Map();
        for (const option of evaluateAllOptions(ctx)) {
            for (const check of option.checks.filter((item) => item.status === "FAIL")) {
                const known = reasons.get(check.code);
                if (known) known.occurrences += 1;
                else reasons.set(check.code, { code: check.code, label: check.label, message: check.message, occurrences: 1 });
            }
        }
        return [...reasons.values()];
    };
    return tx ? run(tx) : getPrisma().$transaction(run);
};

// Safety net before publishing: the FAIL rules for every order on every trip of the plan.
// trips: the plan's trips as returned by plans.repository.findPlanTripsForPublishTx.
// Returns [{ tripCode, orderReference, code, message }] (empty when everything holds).
export const recheckTripsTx = async (tx, { trips, deliveryDate }) => {
    if (trips.length === 0) return [];
    const isOperatingDay = await referenceService.isOperatingDate(deliveryDate);

    const vehicles = [...new Map(trips.map((trip) => [trip.vehicleId, trip.vehicle])).values()].map((vehicle) => ({
        ...vehicle,
        maxWeightKg: toNumber(vehicle.maxWeightKg),
        maxVolumeM3: toNumber(vehicle.maxVolumeM3),
        weeklyFuelQuotaL: toNumber(vehicle.weeklyFuelQuotaL),
    }));
    const weekStart = mondayOf(deliveryDate);
    const fuelByVehicle = await fleetService.getWeeklyFuelForVehicles(vehicles, weekStart);
    const unpublished = await tripsService.getUnpublishedPlannedFuel({ vehicleIds: vehicles.map((vehicle) => vehicle.id), date: deliveryDate }, tx);

    const failures = [];
    for (const trip of trips) {
        const vehicle = vehicles.find((candidate) => candidate.id === trip.vehicleId);
        const orders = trip.stops.flatMap((stop) => stop.allocations.map((allocation) => allocation.order));
        const totalWeight = orders.reduce((sum, order) => sum + toNumber(order.totalWeightKg), 0);
        const totalVolume = orders.reduce((sum, order) => sum + toNumber(order.totalVolumeM3), 0);
        const quotaLeft = (fuelByVehicle.get(vehicle.id)?.remainingL ?? vehicle.weeklyFuelQuotaL) - (unpublished.get(vehicle.id) ?? 0);

        for (const order of orders) {
            const { checks } = evaluateAllocation({
                order: {
                    depotId: order.depotId,
                    deliveryDate,
                    tempClass: order.tempClass,
                    weightKg: toNumber(order.totalWeightKg),
                    volumeM3: toNumber(order.totalVolumeM3),
                    vanOnly: order.vanOnly,
                    isMall: false,
                    window: null,
                    mallAccessWindow: null,
                },
                vehicle,
                tripNumber: trip.tripNumber,
                // what is on the trip besides this order, so that "after" equals the trip's total
                tripLoad: { weightKg: totalWeight - toNumber(order.totalWeightKg), volumeM3: totalVolume - toNumber(order.totalVolumeM3) },
                isOperatingDay,
                // the trip's fuel is already part of the unpublished sum: it is over quota when that sum exceeds what is left
                fuel: { remainingL: quotaLeft, additionalL: 0, measurable: true },
                nearCapacityThreshold: 1,
                deferredPreviousDay: false,
                predictedArrival: null,
            });
            for (const check of checks.filter((item) => item.status === "FAIL")) {
                failures.push({ tripCode: trip.code, orderReference: order.reference, code: check.code, message: check.message });
            }
        }
    }
    return failures;
};
