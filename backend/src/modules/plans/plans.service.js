import { AppError } from "../../utils/appError.js";
import { OrderStatus, Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { businessMinutesOfDay, fromYmd, minutesToHHMM, mondayOf, toYmd, todayBusinessDate } from "../../utils/businessTime.js";
import * as usersService from "../users/users.service.js";
import * as auditService from "../audit/audit.service.js";
import * as referenceService from "../reference/reference.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as tripsService from "../trips/trips.service.js";
import * as allocationsService from "../allocations/allocations.service.js";
import * as deferralsService from "../deferrals/deferrals.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
// publishing writes fuel-ledger rows in the same transaction
import { createPlannedFuelEntriesTx } from "../fleet/fleet.repository.js";
import {
    countUnfinishedTripsTx,
    createLoadingSessionsTx,
    createPlanTx,
    findPlanByDepotDate,
    findPlanById,
    findPlanTripsForPublishTx,
    listPlans,
    lockPlanTx,
    updatePlanTx,
} from "./plans.repository.js";
import { toPlanDTO, toPlanListDTO, toPlanQueueDTO, toPublishResultDTO } from "./plans.dto.js";

// publishing writes sessions, item checks, ledger rows, notifications and audit in one go
const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

const PUBLISHABLE = ["CLOSED", "DRAFT"];

const QUEUE_FILTERS = {
    unplanned: [OrderStatus.CONFIRMED, OrderStatus.DEFERRED],
    planned: [OrderStatus.PLANNED],
    all: undefined, // CONFIRMED, DEFERRED and PLANNED
};

const loadPlanInScope = async (planId, scope, tx) => {
    const plan = await findPlanById(planId, tx);
    if (!plan) throw new AppError("Plan not found.", 404);
    assertDepotAccess(scope, plan.depotId);
    return plan;
};

const withDetails = async (plan, tx) => {
    const [queueCounts, trips] = await Promise.all([
        ordersService.countOrdersForDepotDate({ depotId: plan.depotId, deliveryDate: toYmd(plan.deliveryDate) }, tx),
        tripsService.listTripSummariesForPlan(plan.id),
    ]);
    return toPlanDTO(plan, { queueCounts, trips });
};

// ---- close ----

// "Close orders": the cut-off has passed, so the day's orders are fixed and planning can start.
export const closeOrdersService = async ({ userId, depotId, deliveryDate, context, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    assertDepotAccess(scope, depotId);

    if (!(await referenceService.isOperatingDate(deliveryDate))) {
        throw new AppError(`${deliveryDate} is not an operating day.`, 422);
    }
    const cutoffAt = await referenceService.getCutoffAt(deliveryDate);
    if (now.getTime() <= cutoffAt.getTime()) {
        throw new AppError(
            `Orders for ${deliveryDate} are still open until ${minutesToHHMM(businessMinutesOfDay(cutoffAt))} on ${todayBusinessDate(cutoffAt)}.`,
            409,
        );
    }

    const db = getPrisma();
    const plan = await db.$transaction(async (tx) => {
        const existing = await findPlanByDepotDate({ depotId, deliveryDate: fromYmd(deliveryDate) }, tx);

        // closing a CLOSED or DRAFT plan again just returns it
        if (existing && PUBLISHABLE.includes(existing.status)) return existing;
        if (existing && existing.status !== "OPEN") {
            throw new AppError("The plan is already published.", 409);
        }

        const closed = existing
            ? await updatePlanTx(tx, existing.id, { status: "CLOSED", closedAt: now, closedById: userId })
            : await createPlanTx(tx, { depotId, deliveryDate: fromYmd(deliveryDate), status: "CLOSED", closedAt: now, closedById: userId });

        await auditService.recordTx(tx, {
            ...context,
            action: "ORDERS_CLOSED",
            entityType: "DispatchPlan",
            entityId: closed.id,
            before: { status: existing?.status ?? null },
            after: { status: "CLOSED", depotId, deliveryDate },
        });
        return closed;
    }, TX_OPTIONS);

    return withDetails(plan);
};

// ---- reads ----

export const listPlansService = async ({ userId, depotId, deliveryDate, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    if (depotId) assertDepotAccess(scope, depotId);

    const where = {
        ...(depotId ? { depotId } : scope.role === Role.ADMIN ? {} : { depotId: { in: scope.depotIds } }),
        ...(deliveryDate && { deliveryDate: fromYmd(deliveryDate) }),
    };

    const { rows, total } = await listPlans({ where, skip: (page - 1) * pageSize, take: pageSize });
    const items = await Promise.all(rows.map((plan) => withDetails(plan)));
    return toPlanListDTO(items, { page, pageSize, total });
};

export const getPlanService = async ({ userId, id }) => {
    const scope = await usersService.getScope(userId);
    return withDetails(await loadPlanInScope(id, scope));
};

// Orders of the plan's depot and date waiting for planning (or already planned), with outlet
// constraints, same-outlet siblings and how often the outlet was deferred on consecutive runs.
export const getPlanQueueService = async ({ userId, id, filter, brand, tempClass, q }) => {
    const scope = await usersService.getScope(userId);
    const plan = await loadPlanInScope(id, scope);
    const deliveryDate = toYmd(plan.deliveryDate);

    const orders = await ordersService.listPlanningQueue({
        depotId: plan.depotId,
        deliveryDate,
        statuses: QUEUE_FILTERS[filter],
        brand,
        tempClass,
        q,
    });
    const counts = await deferralsService.getConsecutiveCounts({
        outletIds: [...new Set(orders.map((order) => order.outlet.id))],
        planDate: deliveryDate,
    });

    const countsByStatus = await ordersService.countOrdersForDepotDate({ depotId: plan.depotId, deliveryDate });
    return toPlanQueueDTO({
        plan,
        orders: orders.map((order) => ({ ...order, consecutiveDeferrals: counts.get(order.outlet.id) ?? 0 })),
        countsByStatus,
    });
};

// ---- publish ----

// Publishing freezes the plan: loading sessions and item checks are created, planned fuel is booked,
// and store managers, drivers and loaders are told. After this, allocation changes are refused (409).
export const publishPlanService = async ({ userId, id, context, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    const preview = await loadPlanInScope(id, scope);
    const deliveryDate = toYmd(preview.deliveryDate);

    const db = getPrisma();
    const result = await db.$transaction(async (tx) => {
        await lockPlanTx(tx, id);

        const plan = await findPlanById(id, tx);
        if (!plan || plan.status === "OPEN") throw new AppError("Orders are not closed for this date.", 409);
        if (!PUBLISHABLE.includes(plan.status)) throw new AppError("The plan is already published.", 409);

        // 1. every order of the day is planned (an order still waiting - confirmed, or deferred into this date
        //    but not placed - would be stranded once the plan is frozen)
        const queue = await ordersService.listPlanningQueue({ depotId: plan.depotId, deliveryDate }, tx);
        const waiting = queue.filter((order) => order.status !== OrderStatus.PLANNED);
        if (waiting.length > 0) {
            throw new AppError(`${waiting.length} order(s) are not planned yet. Plan or defer them before publishing.`, 422, {
                code: "ORDERS_NOT_PLANNED",
                orders: waiting.map((order) => ({ orderId: order.id, reference: order.reference, status: order.status, outlet: order.outlet.code })),
            });
        }

        // 2. no deferral decision is still open
        const pending = await deferralsService.countPendingDecisions(id, tx);
        if (pending > 0) {
            throw new AppError(`${pending} deferral decision(s) are still open for this plan.`, 422, { code: "DEFERRALS_PENDING", pendingDecisions: pending });
        }

        const trips = await findPlanTripsForPublishTx(tx, id);
        if (trips.length === 0) throw new AppError("The plan has no trips to publish.", 422, { code: "NO_TRIPS" });

        // 3. safety net: the hard rules once more, for every trip
        const failures = await allocationsService.recheckTripsTx(tx, { trips, deliveryDate });
        if (failures.length > 0) {
            throw new AppError(`${failures.length} allocation rule(s) are violated; the plan cannot be published.`, 422, {
                code: "ALLOCATION_RULES_VIOLATED",
                failures,
            });
        }

        // 4. loading tasks and planned fuel
        const { sessions, itemChecks } = await createLoadingSessionsTx(tx, trips);
        const weekStart = fromYmd(mondayOf(deliveryDate));
        await createPlannedFuelEntriesTx(
            tx,
            trips.map((trip) => ({
                vehicleId: trip.vehicleId,
                weekStart,
                tripId: trip.id,
                distanceKm: trip.plannedDistanceKm,
                litres: trip.plannedFuelL,
            })),
        );

        // 5. the plan is published
        const published = await updatePlanTx(tx, id, {
            status: "PUBLISHED",
            publishedAt: now,
            publishedById: userId,
            version: { increment: 1 },
        });

        // 6. tell store managers, drivers and loaders
        const placed = trips.flatMap((trip) => trip.stops.flatMap((stop) => stop.allocations.map(({ order }) => ({ order, trip }))));
        const managersByOutlet = await notificationsService.storeManagersOfOutlets([...new Set(placed.map(({ order }) => order.outletId))]);
        const loaderIds = await notificationsService.usersOfDepot(plan.depotId, Role.LOADER);
        const hhmm = (minutes) => (minutes === null || minutes === undefined ? "--:--" : minutesToHHMM(minutes));

        await notificationsService.notifyManyTx(tx, [
            ...placed.map(({ order, trip }) => ({
                userIds: managersByOutlet.get(order.outletId) ?? [],
                payload: notificationsService.buildOrderPlannedNotification({
                    orderId: order.id,
                    reference: order.reference,
                    deliveryDate,
                    tripCode: trip.code,
                    windowStart: hhmm(order.windowStartMin),
                    windowEnd: hhmm(order.windowEndMin),
                }),
            })),
            ...trips
                .filter((trip) => trip.driverId)
                .map((trip) => ({
                    userIds: [trip.driverId],
                    payload: notificationsService.buildRouteAssignedNotification({
                        tripId: trip.id,
                        tripCode: trip.code,
                        deliveryDate,
                        stopCount: trip.stops.length,
                    }),
                })),
            {
                userIds: loaderIds,
                payload: notificationsService.buildLoadingReadyNotification({ planId: id, deliveryDate, tripCount: trips.length }),
            },
        ]);

        await auditService.recordTx(tx, {
            ...context,
            action: "PLAN_PUBLISHED",
            entityType: "DispatchPlan",
            entityId: id,
            before: { status: plan.status, version: plan.version },
            after: { status: "PUBLISHED", version: published.version, trips: trips.length, orders: placed.length },
        });

        return { plan: published, trips: trips.length, orders: placed.length, sessions, itemChecks };
    }, TX_OPTIONS);

    return toPublishResultDTO(await withDetails(result.plan), result);
};

// ---- prompt 3: execution status of a published plan ----

// The first trip leaves: PUBLISHED -> IN_EXECUTION. Returns true when the status changed and false when
// the plan was already IN_EXECUTION. Any other status is a 409.
export const markInExecutionTx = async (tx, planId) => {
    await lockPlanTx(tx, planId);
    const plan = await findPlanById(planId, tx);
    if (!plan) throw new AppError("Plan not found.", 404);
    if (plan.status === "IN_EXECUTION") return false;
    if (plan.status !== "PUBLISHED") {
        throw new AppError(`The plan is ${plan.status}; trips can only leave once it is published.`, 409);
    }
    await updatePlanTx(tx, planId, { status: "IN_EXECUTION" });
    return true;
};

// The last trip finishes: IN_EXECUTION -> COMPLETED once every trip is COMPLETED or CANCELLED. Returns
// true when the plan was completed. The plan lock makes two trips that finish at the same time see each
// other's result, so a plan cannot be left open by a race.
export const markCompletedIfDoneTx = async (tx, planId) => {
    await lockPlanTx(tx, planId);
    const plan = await findPlanById(planId, tx);
    if (!plan || plan.status !== "IN_EXECUTION") return false;
    if ((await countUnfinishedTripsTx(tx, planId)) > 0) return false;
    await updatePlanTx(tx, planId, { status: "COMPLETED" });
    return true;
};
