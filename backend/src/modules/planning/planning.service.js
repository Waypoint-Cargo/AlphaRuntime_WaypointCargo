// Implements business logic for order queue cutoffs, capacity/constraint validation, trip routing, and plan publication.
import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
import { colomboDateTime, CUTOFF_HOUR, formatDate, getScope, previousOperatingDate } from "../orders/orders.adapters.js";
import { transitionOrdersTx } from "../orders/orders.service.js";
import { createAuditLogTx } from "../common/audit.repository.js";
import { assertDepotAccess, resolveDepotId } from "../common/scope.js";
import { createPlannedFuelEntryTx } from "../fleet/fleet.repository.js";
import { createSessionWithChecksTx } from "../loading/loading.repository.js";
import { createNotificationsTx, findRecipientsTx } from "../notifications/notifications.repository.js";
import { createDeferralsTx, findOutletDeferralOn } from "../deferrals/deferrals.repository.js";
import { weekStartOf } from "../allocations/allocation.engine.js";
import {
	countOrdersByStatus, countOutletSiblings, createPlanTx, fetchQueue, findPlanByDepotDate, findPlanById, listOrdersByStatusesTx,
	listPlans, listTripsForPlan, lockPlanTx, updatePlanTx,
} from "./planning.repository.js";
import { toPlanDTO, toQueueItemDTO, toTripDTO } from "./planning.dto.js";

const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };
const dateValue = (date) => new Date(`${date}T00:00:00.000Z`);
const num = (value) => (value === null || value === undefined ? 0 : Number(value));

const loadPlanInScope = async (client, scope, id) => {
	const plan = await findPlanById(client, id);
	if (!plan) throw new AppError("Plan not found.", 404, { code: "NOT_FOUND" });
	assertDepotAccess(scope, plan.depotId);
	return plan;
};

const planDTO = async (client, plan, extra) => toPlanDTO(plan, await countOrdersByStatus(client, plan.depotId, plan.deliveryDate), extra);

// 9.1 - close the order queue for a depot-day. Idempotent: closing an already-closed plan returns it unchanged.
export const closePlanService = async ({ actor, depotId: requestedDepotId, deliveryDate, meta = {} }) => {
	const scope = await getScope(actor);
	const depotId = resolveDepotId(scope, requestedDepotId);
	const date = dateValue(deliveryDate);

	const calendar = await getPrisma().calendarDay.findUnique({ where: { date }, select: { isOperatingDay: true } });
	if (!calendar) throw new AppError("That date is outside the operating calendar.", 422, { code: "DATE_OUTSIDE_CALENDAR" });
	if (!calendar.isOperatingDay) throw new AppError("That date is not an operating day.", 422, { code: "NOT_OPERATING_DAY" });

	const previousDay = previousOperatingDate(deliveryDate);
	const cutoffPassed = previousDay ? new Date() > colomboDateTime(previousDay, CUTOFF_HOUR) : true;

	return getPrisma().$transaction(async (tx) => {
		let plan = await findPlanByDepotDate(tx, depotId, date);
		let changed = false;
		if (!plan) {
			try {
				plan = await createPlanTx(tx, { depotId, deliveryDate: date, status: "CLOSED", closedAt: new Date(), closedById: actor.id });
				changed = true;
			} catch (error) {
				// two dispatchers closing at once: the unique (depot, date) index let one win
				if (error?.code !== "P2002") throw error;
				plan = await findPlanByDepotDate(tx, depotId, date);
			}
		}
		if (!changed) {
			await lockPlanTx(tx, plan.id);
			plan = await findPlanById(tx, plan.id);
			if (["PUBLISHED", "IN_EXECUTION", "COMPLETED"].includes(plan.status)) {
				throw new AppError("This plan is already published.", 409, { code: "PLAN_ALREADY_PUBLISHED", status: plan.status });
			}
			if (plan.status === "OPEN") {
				plan = await updatePlanTx(tx, plan.id, { status: "CLOSED", closedAt: new Date(), closedById: actor.id });
				changed = true;
			}
		}
		if (changed) {
			await createAuditLogTx(tx, { actorId: actor.id, action: "PLAN_CLOSED", entityType: "DispatchPlan", entityId: plan.id, after: { status: plan.status, deliveryDate, depotId }, ...meta });
		}
		return planDTO(tx, plan, { cutoffPassed, alreadyClosed: !changed });
	}, TX_OPTIONS);
};

// 9.2
export const listPlansService = async ({ actor, filters }) => {
	const db = getPrisma();
	const scope = await getScope(actor);
	if (filters.depotId) assertDepotAccess(scope, filters.depotId);
	const plans = await listPlans(db, {
		depotId: filters.depotId,
		depotIds: scope.all ? undefined : scope.depotIds,
		deliveryDate: filters.deliveryDate ? dateValue(filters.deliveryDate) : undefined,
		status: filters.status,
	});
	return Promise.all(plans.map((plan) => planDTO(db, plan)));
};

// 9.3 - plan header, counts and every trip with its stops and orders.
export const getPlanService = async ({ actor, id }) => {
	const db = getPrisma();
	const plan = await loadPlanInScope(db, await getScope(actor), id);
	const trips = await listTripsForPlan(db, id);
	return { ...(await planDTO(db, plan)), trips: trips.map(toTripDTO) };
};

// 9.4 - the "Orders to Plan" queue for the plan's depot-day.
export const getPlanQueueService = async ({ actor, id, query }) => {
	const db = getPrisma();
	const plan = await loadPlanInScope(db, await getScope(actor), id);
	const { items, total } = await fetchQueue(db, { depotId: plan.depotId, deliveryDate: plan.deliveryDate, ...query });
	const siblings = await countOutletSiblings(db, plan.depotId, plan.deliveryDate, [...new Set(items.map((order) => order.outletId))]);
	return {
		items: items.map((order) => toQueueItemDTO(order, siblings.get(order.outletId) ?? 1)),
		meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
		plan: await planDTO(db, plan),
	};
};

// 9.5 - publish. One transaction: lock -> validate -> defer leftovers -> fuel ledger -> loading sessions ->
// notifications -> audit -> status. Anything that throws rolls the whole publication back.
export const publishPlanService = async ({ actor, id, input = {}, meta = {} }) => {
	const scope = await getScope(actor);

	return getPrisma().$transaction(async (tx) => {
		await loadPlanInScope(tx, scope, id);
		await lockPlanTx(tx, id);
		const plan = await findPlanById(tx, id); // re-read under the lock
		const date = formatDate(plan.deliveryDate);

		if (["PUBLISHED", "IN_EXECUTION", "COMPLETED"].includes(plan.status)) {
			throw new AppError("This plan has already been published.", 409, { code: "PLAN_ALREADY_PUBLISHED", status: plan.status });
		}
		if (plan.status === "OPEN") {
			throw new AppError("Close the order queue before publishing the plan.", 409, { code: "PLAN_NOT_CLOSED" });
		}

		const trips = await listTripsForPlan(tx, id);
		const unplanned = await listOrdersByStatusesTx(tx, plan.depotId, plan.deliveryDate, ["CONFIRMED"]);
		if (!trips.length) {
			throw new AppError("There is nothing to publish: no orders have been allocated to a trip.", 422, { code: "PLAN_EMPTY" });
		}
		if (unplanned.length && !input.deferUnplanned) {
			throw new AppError(`${unplanned.length} confirmed order(s) are still unplanned. Allocate them or choose to defer them.`, 409, {
				code: "UNPLANNED_ORDERS_REMAIN", count: unplanned.length, references: unplanned.slice(0, 20).map((order) => order.reference),
			});
		}

		// Defence in depth: the allocation trigger already enforces this, but publish must never ship an overloaded trip.
		for (const trip of trips) {
			if (!trip.stops.length || trip.stops.some((stop) => !stop.allocations.length)) {
				throw new AppError(`Trip ${trip.code} has an empty stop.`, 422, { code: "TRIP_INVALID", tripCode: trip.code });
			}
			if (num(trip.plannedWeightKg) > num(trip.vehicle.maxWeightKg) || num(trip.plannedVolumeM3) > num(trip.vehicle.maxVolumeM3)) {
				throw new AppError(`Trip ${trip.code} exceeds its vehicle capacity.`, 422, { code: "TRIP_OVER_CAPACITY", tripCode: trip.code });
			}
		}

		// 1. leftovers become DEFERRED orders with a Deferral record
		if (unplanned.length) {
			await transitionOrdersTx(tx, {
				orderIds: unplanned.map((order) => order.id), toStatus: "DEFERRED", actorId: actor.id,
				reason: "PLAN_PUBLISH_DEFERRED", data: { reason: input.deferralReason, planId: plan.id },
			});
			const previousDay = previousOperatingDate(date);
			const previousByOutlet = new Map();
			for (const outletId of new Set(unplanned.map((order) => order.outletId))) {
				const previous = previousDay ? await findOutletDeferralOn(tx, outletId, dateValue(previousDay)) : null;
				previousByOutlet.set(outletId, (previous?.consecutiveCount ?? 0) + 1);
			}
			await createDeferralsTx(tx, unplanned.map((order) => ({
				orderId: order.id, outletId: order.outletId, planId: plan.id, fromDate: plan.deliveryDate, status: "DEFERRED",
				reason: input.deferralReason, note: input.note ?? null, detectedConflicts: [], consecutiveCount: previousByOutlet.get(order.outletId),
				decidedById: actor.id, decidedAt: new Date(),
			})));
		}

		// 2. planned fuel (counts against each vehicle's weekly quota) and 3. loading sessions
		const weekStart = dateValue(weekStartOf(date));
		let fuelEntries = 0;
		for (const trip of trips) {
			if (num(trip.plannedDistanceKm) > 0 && num(trip.plannedFuelL) > 0) {
				await createPlannedFuelEntryTx(tx, { vehicleId: trip.vehicleId, weekStart, tripId: trip.id, distanceKm: trip.plannedDistanceKm, litres: trip.plannedFuelL, note: `Planned fuel for ${trip.code}` });
				fuelEntries += 1;
			}
			const checks = trip.stops.flatMap((stop) => stop.allocations.flatMap((allocation) =>
				allocation.order.items.map((item) => ({ orderItemId: item.id, plannedQty: item.quantity }))));
			await createSessionWithChecksTx(tx, { tripId: trip.id, checks });
		}

		// 4. notifications: loaders (what to load), drivers (their route), store managers (their order is planned / deferred)
		const notifications = [];
		const loaders = await findRecipientsTx(tx, { role: "LOADER", depotIds: [plan.depotId] });
		for (const loader of loaders) {
			notifications.push({ userId: loader.id, type: "PLAN_PUBLISHED", severity: "INFO", title: `Plan published for ${date}`, body: `${trips.length} route(s) at ${plan.depot.name} are ready for loading.`, entityType: "DispatchPlan", entityId: plan.id, action: "START_LOADING" });
		}
		for (const trip of trips.filter((candidate) => candidate.driverId)) {
			notifications.push({ userId: trip.driverId, type: "ROUTE_ASSIGNED", severity: "INFO", title: `Route ${trip.code} assigned`, body: `${trip.stops.length} stop(s) on ${date} with ${trip.vehicle.code}.`, entityType: "Trip", entityId: trip.id });
		}
		const plannedOrders = trips.flatMap((trip) => trip.stops.flatMap((stop) => stop.allocations.map((allocation) => ({ order: allocation.order, outletId: stop.outlet.id, trip }))));
		const managers = await findRecipientsTx(tx, { role: "STORE_MANAGER", outletIds: [...new Set([...plannedOrders.map((p) => p.outletId), ...unplanned.map((o) => o.outletId)])] });
		for (const { order, outletId, trip } of plannedOrders) {
			for (const manager of managers.filter((candidate) => candidate.outletId === outletId)) {
				notifications.push({ userId: manager.id, type: "ORDER_PLANNED", severity: "SUCCESS", title: `Order ${order.reference} is planned`, body: `It will be delivered on ${date} on route ${trip.code}.`, entityType: "Order", entityId: order.id });
			}
		}
		for (const order of unplanned) {
			for (const manager of managers.filter((candidate) => candidate.outletId === order.outletId)) {
				notifications.push({ userId: manager.id, type: "ORDER_DEFERRED", severity: "WARNING", title: `Order ${order.reference} was deferred`, body: "It could not be fitted into the dispatch plan and was deferred.", entityType: "Order", entityId: order.id });
			}
		}
		await createNotificationsTx(tx, notifications);

		// 5. flip the plan and write the audit trail
		const published = await updatePlanTx(tx, id, { status: "PUBLISHED", publishedAt: new Date(), publishedById: actor.id });
		const withoutDriver = trips.filter((trip) => !trip.driverId).map((trip) => trip.code);
		await createAuditLogTx(tx, {
			actorId: actor.id, action: "PLAN_PUBLISHED", entityType: "DispatchPlan", entityId: id,
			before: { status: plan.status },
			after: { status: "PUBLISHED", trips: trips.map((trip) => trip.code), deferredOrders: unplanned.map((order) => order.reference), fuelEntries, notifications: notifications.length, tripsWithoutDriver: withoutDriver },
			...meta,
		});

		return {
			...(await planDTO(tx, published)),
			summary: {
				trips: trips.length,
				ordersPlanned: plannedOrders.length,
				ordersDeferred: unplanned.length,
				fuelEntries,
				notificationsSent: notifications.length,
				warnings: withoutDriver.length ? [{ code: "TRIPS_WITHOUT_DRIVER", message: `${withoutDriver.join(", ")} have no driver assigned yet.`, tripCodes: withoutDriver }] : [],
			},
		};
	}, TX_OPTIONS);
};
