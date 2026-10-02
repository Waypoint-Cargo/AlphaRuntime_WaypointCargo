import { AppError } from "../../utils/appError.js";
import { OrderStatus, Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { addDays, fromYmd, toYmd, todayBusinessDate } from "../../utils/businessTime.js";
import * as usersService from "../users/users.service.js";
import * as auditService from "../audit/audit.service.js";
import * as referenceService from "../reference/reference.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as allocationsService from "../allocations/allocations.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import { findPlanByDepotDate, findPlanById, lockPlanTx } from "../plans/plans.repository.js";
import {
    countDeferrals,
    countPendingDecisionsForPlan,
    createDeferralTx,
    decideDeferralTx,
    findConsecutiveCounts,
    findDeferralById,
    findOutletDeferralOnDateTx,
    findPendingDeferralForOrder,
    listDeferrals,
    listOutletDeferrals,
    replanDeferralTx,
} from "./deferrals.repository.js";
import { toDeferralDetailDTO, toDeferralDTO, toDeferralListDTO, toDeferralSummaryDTO } from "./deferrals.dto.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const PLAN_OPEN = ["CLOSED", "DRAFT"];
const DECIDED_STATUSES = ["DEFERRED", "REPLANNED", "SERVED"];
const labelFor = (reason, audience) => notificationsService.deferralReasonLabel(reason, audience);

const notClosed = () => new AppError("Orders are not closed for this date.", 409);

const assertPlanOpen = (plan) => {
    if (!plan || plan.status === "OPEN") throw notClosed();
    if (!PLAN_OPEN.includes(plan.status)) throw new AppError("The plan is already published.", 409);
};

// dispatchers see deferrals of their depots; admins everything
const depotWhere = (scope) => (scope.role === Role.ADMIN ? {} : { outlet: { depotId: { in: scope.depotIds } } });

// ---- used by the plans module ----

// Map(outletId -> consecutive deferrals up to the previous operating day of `planDate`); 0 when none.
export const getConsecutiveCounts = async ({ outletIds, planDate }) => {
    if (outletIds.length === 0) return new Map();
    let previousDate;
    try {
        previousDate = await referenceService.previousOperatingDate(planDate);
    } catch (error) {
        if (error.statusCode !== 422) throw error;
        return new Map(outletIds.map((id) => [id, 0]));
    }
    const rows = await findConsecutiveCounts({ outletIds, fromDate: fromYmd(previousDate) });
    const counts = new Map(outletIds.map((id) => [id, 0]));
    for (const row of rows) counts.set(row.outletId, row._max.consecutiveCount ?? 0);
    return counts;
};

// decisions still open for a plan (they block publishing)
export const countPendingDecisions = (planId, tx) => countPendingDecisionsForPlan(planId, tx);

// ---- the deferral itself ----

// Defers an order to the next operating day inside the caller's transaction:
// the deferral row is decided, the order becomes DEFERRED for the new date and the store managers are told.
const decideInTx = async (tx, { deferralId, order, plan, reason, note, actorId, context, create }) => {
    const fromDate = order.deliveryDate;
    const toDate = await referenceService.nextOperatingDate(fromDate);
    const decidedAt = new Date();

    let resultId = deferralId;
    if (create) {
        const created = await createDeferralTx(tx, {
            orderId: order.id,
            outletId: order.outletId,
            planId: plan.id,
            fromDate: fromYmd(fromDate),
            toDate: fromYmd(toDate),
            status: "DEFERRED",
            reason,
            note: note ?? null,
            detectedConflicts: create.detectedConflicts,
            consecutiveCount: create.consecutiveCount,
            decidedById: actorId,
            decidedAt,
        });
        resultId = created.id;
    } else {
        const { count } = await decideDeferralTx(tx, {
            id: deferralId,
            data: { status: "DEFERRED", reason, note: note ?? null, toDate: fromYmd(toDate), decidedById: actorId, decidedAt },
        });
        if (count !== 1) throw new AppError("This deferral was already decided.", 409);
    }

    // an order that is already DEFERRED goes back to the queue first (the status table has no DEFERRED -> DEFERRED)
    if (order.status === OrderStatus.DEFERRED) {
        await ordersService.transitionOrdersTx(tx, {
            orderIds: [order.id],
            toStatus: OrderStatus.CONFIRMED,
            actorId,
            reason: "Returned to the queue before being deferred again",
        });
    }
    await ordersService.transitionOrdersTx(tx, {
        orderIds: [order.id],
        toStatus: OrderStatus.DEFERRED,
        actorId,
        reason: labelFor(reason, "dispatcher"),
        data: { fromDate, toDate, reason },
    });
    await ordersService.setOrderDeliveryDateTx(tx, order.id, {
        deliveryDate: toDate,
        rolledOver: toDate !== order.requestedDeliveryDate,
        cutoffAt: await referenceService.getCutoffAt(toDate),
    });

    const managerIds = await notificationsService.storeManagersOfOutlet(order.outletId);
    await notificationsService.notifyUsersTx(
        tx,
        managerIds,
        notificationsService.buildOrderDeferredNotification({ orderId: order.id, reference: order.reference, reason, toDate }),
    );

    await auditService.recordTx(tx, {
        ...context,
        action: "ORDER_DEFERRED",
        entityType: "Order",
        entityId: order.id,
        before: { status: order.status, deliveryDate: fromDate },
        after: { status: "DEFERRED", deliveryDate: toDate, reason, planId: plan.id },
    });

    return resultId;
};

// Loads and locks everything a deferral decision works on. Returns the refreshed order and plan.
const lockOrderAndPlan = async (tx, { scope, orderId }) => {
    const preview = await ordersService.getOrderForAllocation(orderId, tx);
    assertDepotAccess(scope, preview.depotId);
    const planPreview = await findPlanByDepotDate({ depotId: preview.depotId, deliveryDate: fromYmd(preview.deliveryDate) }, tx);
    if (!planPreview) throw notClosed();
    await lockPlanTx(tx, planPreview.id);

    const order = await ordersService.getOrderForAllocation(orderId, tx);
    if (order.deliveryDate !== preview.deliveryDate) throw new AppError("The order was moved to another date. Reload and try again.", 409);
    const plan = await findPlanById(planPreview.id, tx);
    assertPlanOpen(plan);
    return { order, plan };
};

export const createDeferralService = async ({ userId, orderId, reason, note, context }) => {
    const scope = await usersService.getScope(userId);
    const db = getPrisma();

    const deferralId = await db.$transaction(async (tx) => {
        let { order, plan } = await lockOrderAndPlan(tx, { scope, orderId });

        const deferrable = [OrderStatus.CONFIRMED, OrderStatus.PLANNED, OrderStatus.DEFERRED];
        if (!deferrable.includes(order.status)) {
            throw new AppError(`Order ${order.reference} is ${order.status}; only confirmed, planned or deferred orders can be deferred.`, 409);
        }
        if (await findPendingDeferralForOrder(orderId, tx)) {
            throw new AppError(`Order ${order.reference} already has a deferral waiting for a decision.`, 409);
        }

        // a planned order leaves its trip first, in this same transaction
        if (order.status === OrderStatus.PLANNED) {
            await allocationsService.unallocateOrderTx(tx, { orderId, context, reason: "Deferred" });
            order = await ordersService.getOrderForAllocation(orderId, tx);
        }

        const detectedConflicts = await allocationsService.explainUnallocatable(orderId, tx);

        // consecutive runs: the outlet's deferral that started on the previous operating day, plus this one
        let consecutiveCount = 1;
        try {
            const previousDate = await referenceService.previousOperatingDate(order.deliveryDate);
            const previous = await findOutletDeferralOnDateTx(tx, { outletId: order.outletId, fromDate: fromYmd(previousDate) });
            if (previous) consecutiveCount = previous.consecutiveCount + 1;
        } catch (error) {
            if (error.statusCode !== 422) throw error;
        }

        if (reason) {
            return decideInTx(tx, {
                order,
                plan,
                reason,
                note,
                actorId: userId,
                context,
                create: { detectedConflicts, consecutiveCount },
            });
        }

        // no reason yet: the order stays where it is and waits for the dispatcher's decision
        const pending = await createDeferralTx(tx, {
            orderId,
            outletId: order.outletId,
            planId: plan.id,
            fromDate: fromYmd(order.deliveryDate),
            status: "PENDING_DECISION",
            note: note ?? null,
            detectedConflicts,
            consecutiveCount,
        });
        return pending.id;
    }, TX_OPTIONS);

    return toDeferralDTO(await findDeferralById(deferralId), labelFor);
};

export const decideDeferralService = async ({ userId, id, reason, note, context }) => {
    const scope = await usersService.getScope(userId);
    const deferral = await findDeferralById(id);
    if (!deferral) throw new AppError("Deferral not found.", 404);
    assertDepotAccess(scope, deferral.outlet.depotId);
    if (deferral.status !== "PENDING_DECISION") {
        throw new AppError(`This deferral is already ${deferral.status}.`, 409);
    }
    if (!deferral.planId) throw new AppError("This deferral is not linked to a plan.", 409);

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        await lockPlanTx(tx, deferral.planId);
        const plan = await findPlanById(deferral.planId, tx);
        assertPlanOpen(plan);

        let order = await ordersService.getOrderForAllocation(deferral.orderId, tx);
        // the dispatcher planned it in the meantime but now decides to defer it
        if (order.status === OrderStatus.PLANNED) {
            await allocationsService.unallocateOrderTx(tx, { orderId: order.id, context, reason: "Deferred" });
            order = await ordersService.getOrderForAllocation(order.id, tx);
        }
        if (![OrderStatus.CONFIRMED, OrderStatus.DEFERRED].includes(order.status)) {
            throw new AppError(`Order ${order.reference} is ${order.status} and can no longer be deferred.`, 409);
        }

        await decideInTx(tx, { deferralId: id, order, plan, reason, note, actorId: userId, context, create: null });
    }, TX_OPTIONS);

    return toDeferralDTO(await findDeferralById(id), labelFor);
};

export const replanDeferralService = async ({ userId, id, context }) => {
    const scope = await usersService.getScope(userId);
    const deferral = await findDeferralById(id);
    if (!deferral) throw new AppError("Deferral not found.", 404);
    assertDepotAccess(scope, deferral.outlet.depotId);
    if (deferral.status !== "DEFERRED") {
        throw new AppError(`Only a deferred order can be replanned; this deferral is ${deferral.status}.`, 409);
    }
    if (!deferral.planId) throw new AppError("This deferral is not linked to a plan.", 409);

    const managerIds = await notificationsService.storeManagersOfOutlet(deferral.outletId);

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        await lockPlanTx(tx, deferral.planId);
        const plan = await findPlanById(deferral.planId, tx);
        if (!plan || !PLAN_OPEN.includes(plan.status)) {
            throw new AppError("The plan this order was deferred from is already published; it cannot be replanned.", 409);
        }

        const order = await ordersService.getOrderForAllocation(deferral.orderId, tx);
        const fromDate = toYmd(deferral.fromDate);
        if (order.status !== OrderStatus.DEFERRED) {
            throw new AppError(`Order ${order.reference} is ${order.status}; only a deferred order can return to planning.`, 409);
        }

        const { count } = await replanDeferralTx(tx, id);
        if (count !== 1) throw new AppError("This deferral can no longer be replanned.", 409);

        await ordersService.transitionOrdersTx(tx, {
            orderIds: [order.id],
            toStatus: OrderStatus.CONFIRMED,
            actorId: userId,
            reason: "Back in planning",
            data: { deliveryDate: fromDate },
        });
        await ordersService.setOrderDeliveryDateTx(tx, order.id, {
            deliveryDate: fromDate,
            rolledOver: fromDate !== order.requestedDeliveryDate,
            cutoffAt: await referenceService.getCutoffAt(fromDate),
        });

        await notificationsService.notifyUsersTx(
            tx,
            managerIds,
            notificationsService.buildOrderReplannedNotification({ orderId: order.id, reference: order.reference, deliveryDate: fromDate }),
        );

        await auditService.recordTx(tx, {
            ...context,
            action: "ORDER_REPLANNED",
            entityType: "Order",
            entityId: order.id,
            before: { status: "DEFERRED", deliveryDate: order.deliveryDate },
            after: { status: "CONFIRMED", deliveryDate: fromDate, planId: plan.id },
        });
    }, TX_OPTIONS);

    return toDeferralDTO(await findDeferralById(id), labelFor);
};

// ---- reads ----

export const listDeferralsService = async ({ userId, date, depotId, brand, status, q, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    if (depotId) assertDepotAccess(scope, depotId);

    const where = {
        AND: [
            depotWhere(scope),
            depotId ? { outlet: { depotId } } : {},
            {
                ...(date && { fromDate: fromYmd(date) }),
                ...(status && { status }),
                ...(brand && { outlet: { brand } }),
                ...(q && {
                    OR: [
                        { order: { reference: { contains: q, mode: "insensitive" } } },
                        { outlet: { name: { contains: q, mode: "insensitive" } } },
                        { outlet: { code: { contains: q, mode: "insensitive" } } },
                    ],
                }),
            },
        ],
    };

    const { rows, total } = await listDeferrals({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toDeferralListDTO(rows, { page, pageSize, total }, labelFor);
};

export const getDeferralSummaryService = async ({ userId, date, depotId, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    const day = date ?? todayBusinessDate(now);
    if (depotId) assertDepotAccess(scope, depotId);
    const scoped = depotId ? { outlet: { depotId } } : depotWhere(scope);

    const [deferredToday, pendingDecisions, deferredLast7Days] = await Promise.all([
        countDeferrals({ ...scoped, fromDate: fromYmd(day), status: { in: DECIDED_STATUSES } }),
        countDeferrals({ ...scoped, fromDate: fromYmd(day), status: "PENDING_DECISION" }),
        countDeferrals({ ...scoped, fromDate: { gte: fromYmd(addDays(day, -6)), lte: fromYmd(day) }, status: { in: DECIDED_STATUSES } }),
    ]);
    return toDeferralSummaryDTO({ date: day, deferredToday, pendingDecisions, deferredLast7Days });
};

export const getDeferralService = async ({ userId, id }) => {
    const scope = await usersService.getScope(userId);
    const deferral = await findDeferralById(id);
    if (!deferral) throw new AppError("Deferral not found.", 404);
    assertDepotAccess(scope, deferral.outlet.depotId);

    const { rows } = await listOutletDeferrals({ outletId: deferral.outletId, skip: 0, take: 10 });
    return toDeferralDetailDTO(deferral, rows, labelFor);
};

export const getOutletHistoryService = async ({ userId, outletId, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    const outlet = await referenceService.getOutlet(outletId);
    assertDepotAccess(scope, outlet.depotId);

    const { rows, total } = await listOutletDeferrals({ outletId, skip: (page - 1) * pageSize, take: pageSize });
    return toDeferralListDTO(rows, { page, pageSize, total }, labelFor);
};
