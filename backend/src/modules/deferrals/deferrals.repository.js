import { getPrisma } from "../../config/database.js";

// deferrals that were actually decided (a PENDING_DECISION one is not a deferral yet)
const DECIDED_STATUSES = ["DEFERRED", "REPLANNED", "SERVED"];

const deferralSelect = {
    id: true,
    orderId: true,
    order: {
        select: {
            id: true,
            reference: true,
            status: true,
            tempClass: true,
            brand: true,
            totalWeightKg: true,
            totalVolumeM3: true,
            deliveryDate: true,
            requestedDeliveryDate: true,
            depotId: true,
        },
    },
    outletId: true,
    outlet: { select: { id: true, code: true, name: true, brand: true, district: true, depotId: true } },
    planId: true,
    plan: { select: { id: true, status: true, depotId: true } },
    fromDate: true,
    toDate: true,
    status: true,
    reason: true,
    note: true,
    detectedConflicts: true,
    consecutiveCount: true,
    decidedById: true,
    decidedBy: { select: { id: true, fullName: true } },
    decidedAt: true,
    createdAt: true,
};

// ---- reads (pass a transaction to read inside it) ----

export const findDeferralById = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.deferral.findUnique({ where: { id }, select: deferralSelect });
};

// the deferral of an order that is still waiting for a decision, if any
export const findPendingDeferralForOrder = async (orderId, tx) => {
    const client = tx ?? getPrisma();
    return client.deferral.findFirst({
        where: { orderId, status: "PENDING_DECISION" },
        select: deferralSelect,
    });
};

// an outlet's deferrals, newest first
export const listOutletDeferrals = async ({ outletId, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.deferral.findMany({
            where: { outletId },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take,
            select: deferralSelect,
        }),
        db.deferral.count({ where: { outletId } }),
    ]);
    return { rows, total };
};

// page of deferrals + total count for the same filter (newest first)
export const listDeferrals = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.deferral.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take,
            select: deferralSelect,
        }),
        db.deferral.count({ where }),
    ]);
    return { rows, total };
};

export const countDeferrals = async (where) => {
    const db = getPrisma();
    return db.deferral.count({ where });
};

// pending decisions of a plan that still matter (the order is waiting for planning)
export const countPendingDecisionsForPlan = async (planId, tx) => {
    const client = tx ?? getPrisma();
    return client.deferral.count({
        where: { planId, status: "PENDING_DECISION", order: { status: { in: ["CONFIRMED", "DEFERRED"] } } },
    });
};

// highest consecutive count per outlet among decided deferrals that started on `fromDate`
export const findConsecutiveCounts = async ({ outletIds, fromDate }) => {
    const db = getPrisma();
    return db.deferral.groupBy({
        by: ["outletId"],
        where: { outletId: { in: outletIds }, fromDate, status: { in: DECIDED_STATUSES } },
        _max: { consecutiveCount: true },
    });
};

// the outlet's decided deferral that started on `fromDate` (highest count first), or null
export const findOutletDeferralOnDateTx = (tx, { outletId, fromDate }) => {
    return tx.deferral.findFirst({
        where: { outletId, fromDate, status: { in: DECIDED_STATUSES } },
        orderBy: { consecutiveCount: "desc" },
        select: { id: true, consecutiveCount: true },
    });
};

// ---- writes ----

export const createDeferralTx = (tx, data) => {
    return tx.deferral.create({ data, select: { id: true } });
};

// Decides a pending deferral. { count: 0 } = it was no longer pending.
export const decideDeferralTx = (tx, { id, data }) => {
    return tx.deferral.updateMany({ where: { id, status: "PENDING_DECISION" }, data });
};

// DEFERRED -> REPLANNED. { count: 0 } = it was not in the DEFERRED state any more.
export const replanDeferralTx = (tx, id) => {
    return tx.deferral.updateMany({ where: { id, status: "DEFERRED" }, data: { status: "REPLANNED" } });
};

// An order that gets allocated has been served: a decided deferral that moved it to this date,
// or an undecided one the dispatcher resolved by planning the order after all.
export const markDeferralServedTx = (tx, { orderId, date }) => {
    return tx.deferral.updateMany({
        where: {
            orderId,
            OR: [
                { status: "DEFERRED", toDate: date },
                { status: "PENDING_DECISION", fromDate: date },
            ],
        },
        data: { status: "SERVED" },
    });
};
