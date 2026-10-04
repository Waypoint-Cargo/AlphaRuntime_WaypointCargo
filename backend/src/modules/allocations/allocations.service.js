// Allocation use-cases (10.1 vehicle options, 10.2 validate, 10.3 allocate, 10.4 unallocate).
// All business rules live in allocation.engine.js (pure). This file only gathers facts, calls the engine, and persists.
import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
import { formatDate, getScope, previousOperatingDate } from "../orders/orders.adapters.js";
import { transitionOrdersTx } from "../orders/orders.service.js";
import { createAuditLogTx } from "../common/audit.repository.js";
import { assertDepotAccess } from "../common/scope.js";
import { findOutletDeferralOn, markReplannedForOrderTx } from "../deferrals/deferrals.repository.js";
import { findPlanByDepotDate, findPlanById, lockPlanTx, updatePlanTx } from "../planning/planning.repository.js";
import * as repo from "./allocations.repository.js";
import { colomboMinutesToDate, DEFAULTS, evaluateAllocation, projectTrip, rankVehicleOptions, scoreOption, weekStartOf } from "./allocation.engine.js";
import { toAllocationDTO, toEvaluationDTO, toVehicleOptionDTO } from "./allocations.dto.js";

const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };
const ALLOCATABLE = ["CONFIRMED", "DEFERRED"];
const PLAN_OPEN_FOR_ALLOCATION = ["CLOSED", "DRAFT"];
const VERDICT_RANK = { PASS: 0, WARN: 1, FAIL: 2 };
const num = (value) => (value === null || value === undefined ? 0 : Number(value));
const toDateValue = (date) => new Date(`${date}T00:00:00.000Z`);

const tripLoad = (stops) => stops.reduce((load, stop) => {
	for (const allocation of stop.allocations) {
		load.weightKg += num(allocation.order.totalWeightKg);
		load.volumeM3 += num(allocation.order.totalVolumeM3);
	}
	return load;
}, { weightKg: 0, volumeM3: 0 });

const orderFacts = (order) => ({
	status: order.status,
	depotId: order.depotId,
	deliveryDate: formatDate(order.deliveryDate),
	tempClass: order.tempClass,
	vanOnly: order.vanOnly ?? order.outlet.vanOnly ?? false, // same COALESCE the DB trigger applies
	totalWeightKg: num(order.totalWeightKg),
	totalVolumeM3: num(order.totalVolumeM3),
	windowStartMin: order.windowStartMin ?? order.outlet.windowStartMin ?? null,
	windowEndMin: order.windowEndMin ?? order.outlet.windowEndMin ?? null,
});

// Gathers everything the engine needs for one order and a set of vehicles. Sequential reads: safe inside a transaction.
const loadContext = async (client, order, vehicles) => {
	const date = formatDate(order.deliveryDate);
	const vehicleIds = vehicles.map((vehicle) => vehicle.id);
	const calendar = await client.calendarDay.findUnique({ where: { date: order.deliveryDate }, select: { isOperatingDay: true } });
	const trips = await repo.findTripsForVehiclesOnDate(client, vehicleIds, order.deliveryDate);
	const fuel = await repo.loadFuelPosition(client, vehicleIds, weekStartOf(date));
	const previousDay = previousOperatingDate(date);
	const previous = previousDay ? await findOutletDeferralOn(client, order.outletId, toDateValue(previousDay)) : null;
	const deferral = previous ? { consecutiveCount: previous.consecutiveCount + (order.status === "DEFERRED" ? 1 : 0) }
		: order.status === "DEFERRED" ? { consecutiveCount: 1 } : null;
	return { date, isOperatingDay: calendar ? calendar.isOperatingDay : true, trips, fuel, deferral };
};

// One (vehicle, trip number) candidate -> engine verdict + route projection.
const evaluateOne = (ctx, order, vehicle, tripNumber, position) => {
	const trip = ctx.trips.find((candidate) => candidate.vehicleId === vehicle.id && candidate.tripNumber === tripNumber) ?? null;
	const stops = trip?.stops ?? [];
	const load = tripLoad(stops);
	const existingIndex = stops.findIndex((stop) => stop.outletId === order.outletId);
	const stopAtOutlet = existingIndex >= 0;

	const routeStops = stops.map((stop) => stop.outlet);
	let targetIndex = existingIndex;
	if (!stopAtOutlet) {
		targetIndex = position ? Math.min(Math.max(position, 1), stops.length + 1) - 1 : stops.length;
		routeStops.splice(targetIndex, 0, order.outlet);
	}
	const projection = projectTrip({ depot: order.depot, stops: routeStops, fuelKmPerLitre: vehicle.fuelKmPerLitre, targetIndex });

	const fuelPosition = ctx.fuel.get(vehicle.id) ?? { viewUsedL: 0, unpublished: new Map() };
	let committedL = fuelPosition.viewUsedL;
	for (const [tripId, litres] of fuelPosition.unpublished) if (tripId !== trip?.id) committedL += litres;

	const evaluation = evaluateAllocation({
		order: orderFacts(order),
		vehicle,
		trip: { status: trip?.status ?? null, weightKg: load.weightKg, volumeM3: load.volumeM3 },
		tripNumber,
		tripDate: ctx.date,
		isOperatingDay: ctx.isOperatingDay,
		fuel: { measurable: projection.fuelMeasurable, quotaL: num(vehicle.weeklyFuelQuotaL), committedL, tripFuelL: projection.fuelL ?? 0 },
		arrivalMin: projection.targetArrivalMin,
		deferral: ctx.deferral,
	});
	const { score, reasons } = scoreOption({ vehicle, order: orderFacts(order), stopAtOutlet, trip: { stopCount: stops.length }, evaluation });
	return { vehicle, tripNumber, trip, stops, load, stopAtOutlet, projection, committedL, evaluation, score, reasons };
};

const loadOrderInScope = async (client, scope, orderId) => {
	const order = await repo.findOrderForAllocation(client, orderId);
	if (!order) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	assertDepotAccess(scope, order.depotId);
	return order;
};

// 10.1 - every active depot vehicle, ranked, with explainable reasons.
export const getVehicleOptionsService = async ({ actor, orderId, sort = "recommended" }) => {
	const db = getPrisma();
	const scope = await getScope(actor);
	const order = await loadOrderInScope(db, scope, orderId);
	if (!ALLOCATABLE.includes(order.status)) {
		throw new AppError(`Vehicle options are only available for confirmed or deferred orders (current: ${order.status}).`, 409, { code: "ORDER_NOT_ALLOCATABLE", status: order.status });
	}
	const vehicles = await repo.listActiveDepotVehicles(db, order.depotId);
	const ctx = await loadContext(db, order, vehicles);

	const perVehicle = vehicles.map((vehicle) => {
		const candidates = [1, 2].map((tripNumber) => evaluateOne(ctx, order, vehicle, tripNumber));
		const best = [...candidates].sort((a, b) =>
			VERDICT_RANK[a.evaluation.verdict] - VERDICT_RANK[b.evaluation.verdict] || b.score - a.score || a.tripNumber - b.tripNumber)[0];
		return {
			...best,
			tripChoices: candidates.map((candidate) => ({
				tripNumber: candidate.tripNumber,
				code: candidate.trip?.code ?? null,
				verdict: candidate.evaluation.verdict,
				stopCount: candidate.stops.length,
				weightKg: candidate.load.weightKg,
				volumeM3: candidate.load.volumeM3,
			})),
		};
	});

	let ranked = rankVehicleOptions(perVehicle);
	if (sort === "capacity") ranked = [...ranked].sort((a, b) => num(b.vehicle.maxWeightKg) - num(a.vehicle.maxWeightKg));

	const blockerCounts = new Map();
	for (const option of ranked) for (const blocker of option.evaluation.blockers) blockerCounts.set(blocker.code, (blockerCounts.get(blocker.code) ?? 0) + 1);
	const feasible = ranked.filter((option) => option.evaluation.verdict !== "FAIL").length;

	return {
		orderId,
		options: ranked.map(toVehicleOptionDTO),
		summary: {
			total: ranked.length,
			feasible,
			blocked: ranked.length - feasible,
			// When nothing fits, say why (most common blockers first) instead of an empty list.
			topBlockers: [...blockerCounts].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count).slice(0, 3),
			message: ranked.length === 0 ? "No active vehicles are assigned to this depot."
				: feasible === 0 ? "No vehicle can take this order - it can be deferred from the plan." : null,
		},
	};
};

const resolveCandidate = async (client, scope, { orderId, vehicleId, tripNumber, position }) => {
	const order = await loadOrderInScope(client, scope, orderId);
	const vehicle = await repo.findVehicle(client, vehicleId);
	if (!vehicle) throw new AppError("Vehicle not found.", 404, { code: "VEHICLE_NOT_FOUND" });
	const ctx = await loadContext(client, order, [vehicle]);
	return { order, vehicle, ctx, option: evaluateOne(ctx, order, vehicle, tripNumber, position) };
};

// 10.2 - dry run of exactly what 10.3 would decide.
export const validateAllocationService = async ({ actor, input }) => {
	const db = getPrisma();
	const scope = await getScope(actor);
	const { order, option } = await resolveCandidate(db, scope, input);
	const plan = await findPlanByDepotDate(db, order.depotId, order.deliveryDate);
	const planReady = Boolean(plan) && PLAN_OPEN_FOR_ALLOCATION.includes(plan.status);
	const evaluation = option.evaluation;
	return {
		orderId: order.id,
		vehicleId: input.vehicleId,
		tripNumber: input.tripNumber,
		...toEvaluationDTO(evaluation),
		canAllocate: evaluation.verdict !== "FAIL" && planReady && !order.allocation,
		requiresAcknowledgement: evaluation.warnings.map((warning) => warning.code),
		plan: { exists: Boolean(plan), status: plan?.status ?? null, ready: planReady },
		stopAtOutlet: option.stopAtOutlet,
		existingTripCode: option.trip?.code ?? null,
		estimatedArrivalMin: option.projection.targetArrivalMin,
		fuel: { measurable: option.projection.fuelMeasurable, tripFuelL: option.projection.fuelL, committedL: option.committedL, quotaL: num(option.vehicle.weeklyFuelQuotaL), distanceKm: option.projection.distanceKm },
	};
};

// Recomputes a trip's load, distance, fuel and per-stop timings from its current allocations.
const recalcTrip = async (tx, tripId) => {
	const trip = await repo.findTripFull(tx, tripId);
	const load = tripLoad(trip.stops);
	const projection = projectTrip({ depot: trip.plan.depot, stops: trip.stops.map((stop) => stop.outlet), fuelKmPerLitre: trip.vehicle.fuelKmPerLitre });
	for (const [index, stop] of trip.stops.entries()) {
		await repo.updateStopRoute(tx, stop.id, {
			legDistanceKm: projection.routeMeasurable ? projection.legs[index] : null,
			plannedArrival: projection.routeMeasurable ? colomboMinutesToDate(trip.deliveryDate, projection.arrivalsMin[index]) : null,
		});
	}
	await repo.updateTrip(tx, tripId, {
		plannedWeightKg: Math.round(load.weightKg * 100) / 100,
		plannedVolumeM3: Math.round(load.volumeM3 * 1000) / 1000,
		plannedDistanceKm: projection.distanceKm ?? 0,
		plannedFuelL: projection.fuelL ?? 0,
		plannedDeparture: colomboMinutesToDate(trip.deliveryDate, DEFAULTS.departureMin),
		plannedReturn: projection.returnMin !== null ? colomboMinutesToDate(trip.deliveryDate, projection.returnMin) : null,
	});
	return repo.findTripFull(tx, tripId);
};

// 10.3 - the concurrency-safe write path. The plan row lock serialises dispatchers working on the same depot-day, and
// every fact is re-read AFTER the lock so two simultaneous clicks cannot overfill a vehicle.
export const createAllocationService = async ({ actor, input, meta = {} }) => {
	const scope = await getScope(actor);
	const acknowledged = new Set(input.acknowledgeWarnings ?? []);

	return getPrisma().$transaction(async (tx) => {
		const first = await loadOrderInScope(tx, scope, input.orderId);
		const plan = await findPlanByDepotDate(tx, first.depotId, first.deliveryDate);
		if (!plan) {
			throw new AppError("Close the order queue for this date before allocating orders.", 409, { code: "PLAN_NOT_CLOSED" });
		}
		await lockPlanTx(tx, plan.id);
		const lockedPlan = await findPlanById(tx, plan.id);
		if (!PLAN_OPEN_FOR_ALLOCATION.includes(lockedPlan.status)) {
			throw new AppError(lockedPlan.status === "OPEN"
				? "Close the order queue for this date before allocating orders."
				: "This plan is published and locked. Allocations can no longer change.", 409, { code: lockedPlan.status === "OPEN" ? "PLAN_NOT_CLOSED" : "PLAN_LOCKED", status: lockedPlan.status });
		}

		const { order, vehicle, option } = await resolveCandidate(tx, scope, input); // fresh reads under the lock
		if (order.allocation) throw new AppError("This order is already allocated.", 409, { code: "ALREADY_ALLOCATED" });

		const { evaluation } = option;
		if (evaluation.verdict === "FAIL") {
			throw new AppError("This allocation breaks a hard rule and cannot be saved.", 422, { code: "ALLOCATION_BLOCKED", verdict: "FAIL", blockers: evaluation.blockers, checks: evaluation.checks });
		}
		const missing = evaluation.warnings.filter((warning) => !acknowledged.has(warning.code));
		if (missing.length) {
			throw new AppError("This allocation has warnings that must be acknowledged first.", 409, { code: "WARNINGS_NOT_ACKNOWLEDGED", verdict: "WARN", warnings: evaluation.warnings, missing: missing.map((warning) => warning.code) });
		}

		let trip = await repo.findTrip(tx, vehicle.id, order.deliveryDate, input.tripNumber);
		if (!trip) {
			trip = await repo.createTrip(tx, {
				code: await repo.nextTripCode(tx), planId: plan.id, vehicleId: vehicle.id, driverId: null, // drivers pick their own task later (deliveries module)
				deliveryDate: order.deliveryDate, tripNumber: input.tripNumber,
			});
		} else if (trip.status === "CANCELLED") {
			trip = await repo.reviveTrip(tx, trip.id, { planId: plan.id, driverId: null });
		}

		// Orders for the same outlet share one stop (unique per trip + outlet).
		let stop = trip.stops.find((candidate) => candidate.outletId === order.outletId);
		if (!stop) {
			const position = input.position ? Math.min(input.position, trip.stops.length + 1) : trip.stops.length + 1;
			if (position <= trip.stops.length) await repo.shiftStopsFrom(tx, trip.id, position);
			stop = await repo.createStop(tx, { tripId: trip.id, outletId: order.outletId, sequence: position });
		}

		const warningsAcknowledged = evaluation.warnings.map(({ code, message }) => ({ code, message }));
		// The allocation row goes in BEFORE the status change: the DB trigger only accepts CONFIRMED/DEFERRED orders.
		const allocation = await repo.createAllocation(tx, {
			orderId: order.id, stopId: stop.id, allocatedById: actor.id,
			...(warningsAcknowledged.length ? { warningsAcknowledged } : {}),
		});
		const updatedTrip = await recalcTrip(tx, trip.id);

		await transitionOrdersTx(tx, {
			orderIds: [order.id], toStatus: "PLANNED", actorId: actor.id, reason: "ALLOCATED",
			data: { tripId: trip.id, tripCode: trip.code, stopId: stop.id, vehicleId: vehicle.id, warnings: warningsAcknowledged.map((w) => w.code) },
		});
		if (order.status === "DEFERRED") await markReplannedForOrderTx(tx, order.id, actor.id);

		const updatedPlan = await updatePlanTx(tx, plan.id, lockedPlan.status === "CLOSED" ? { status: "DRAFT" } : {});
		await createAuditLogTx(tx, {
			actorId: actor.id, action: "ORDER_ALLOCATED", entityType: "Order", entityId: order.id,
			before: { status: order.status },
			after: { status: "PLANNED", tripCode: trip.code, vehicleCode: vehicle.code, tripNumber: input.tripNumber, stopSequence: stop.sequence, warnings: warningsAcknowledged },
			...meta,
		});

		const finalStop = updatedTrip.stops.find((candidate) => candidate.id === stop.id) ?? stop;
		return toAllocationDTO({ allocation, order, trip: updatedTrip, stop: finalStop, evaluation, planVersion: updatedPlan.version });
	}, TX_OPTIONS);
};

// 10.4 - remove an allocation, collapse the stop/trip if they became empty, and send the order back to CONFIRMED.
export const unallocateOrderService = async ({ actor, orderId, reason, meta = {} }) => {
	const scope = await getScope(actor);

	return getPrisma().$transaction(async (tx) => {
		const first = await loadOrderInScope(tx, scope, orderId);
		if (!first.allocation) throw new AppError("This order is not allocated.", 409, { code: "NOT_ALLOCATED" });
		const planId = first.allocation.stop.trip.planId;

		await lockPlanTx(tx, planId);
		const plan = await findPlanById(tx, planId);
		if (!PLAN_OPEN_FOR_ALLOCATION.includes(plan.status)) {
			throw new AppError("This plan is published and locked. Allocations can no longer change.", 409, { code: "PLAN_LOCKED", status: plan.status });
		}
		const order = await repo.findOrderForAllocation(tx, orderId); // fresh after the lock
		if (!order.allocation) throw new AppError("This order is not allocated.", 409, { code: "NOT_ALLOCATED" });
		const { stop } = order.allocation;
		if (stop.trip.status !== "PLANNED") {
			throw new AppError(`The trip is already ${stop.trip.status}; its orders can no longer be removed.`, 409, { code: "TRIP_LOCKED", status: stop.trip.status });
		}

		await repo.deleteAllocation(tx, orderId);
		let tripRemoved = false;
		if ((await repo.countStopAllocations(tx, stop.id)) === 0) {
			await repo.deleteStop(tx, stop.id);
			await repo.resequenceStops(tx, stop.trip.id);
			if ((await repo.countTripStops(tx, stop.trip.id)) === 0) {
				await repo.deleteTrip(tx, stop.trip.id);
				tripRemoved = true;
			}
		}
		if (!tripRemoved) await recalcTrip(tx, stop.trip.id);

		await transitionOrdersTx(tx, { orderIds: [orderId], toStatus: "CONFIRMED", actorId: actor.id, reason: reason ?? "UNALLOCATED", data: { tripCode: stop.trip.code } });

		const remainingTrips = await tx.trip.count({ where: { planId, status: { not: "CANCELLED" } } });
		const updatedPlan = await updatePlanTx(tx, planId, plan.status === "DRAFT" && remainingTrips === 0 ? { status: "CLOSED" } : {});
		await createAuditLogTx(tx, {
			actorId: actor.id, action: "ORDER_UNALLOCATED", entityType: "Order", entityId: orderId,
			before: { status: "PLANNED", tripCode: stop.trip.code }, after: { status: "CONFIRMED", tripRemoved }, ...meta,
		});

		return { orderId, reference: order.reference, status: "CONFIRMED", tripCode: stop.trip.code, tripRemoved, planVersion: updatedPlan.version, planStatus: updatedPlan.status };
	}, TX_OPTIONS);
};
