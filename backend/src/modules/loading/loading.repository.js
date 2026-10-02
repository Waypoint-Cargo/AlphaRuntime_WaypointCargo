import { getPrisma } from "../../config/database.js";

const person = { select: { id: true, fullName: true } };

const sessionSelect = {
    id: true,
    startedAt: true,
    startedBy: person,
    completedAt: true,
    completedBy: person,
    departedShort: true,
};

const taskListSelect = {
    id: true,
    code: true,
    tripNumber: true,
    status: true,
    deliveryDate: true,
    plannedDeparture: true,
    plan: { select: { id: true, status: true, depotId: true, depot: { select: { id: true, code: true, name: true } } } },
    vehicle: { select: { id: true, code: true, type: true, isRefrigerated: true } },
    driver: person,
    loadingSession: { select: sessionSelect },
    _count: { select: { stops: true } },
};

const taskDetailSelect = {
    ...taskListSelect,
    actualDeparture: true,
    loadingSession: {
        select: {
            ...sessionSelect,
            checks: { select: { orderItemId: true, plannedQty: true, loadedQty: true, status: true, checkedAt: true } },
        },
    },
    stops: {
        orderBy: { sequence: "asc" },
        select: {
            id: true,
            sequence: true,
            outlet: { select: { id: true, code: true, name: true, brand: true } },
            allocations: {
                select: {
                    order: {
                        select: {
                            id: true,
                            reference: true,
                            brand: true,
                            tempClass: true,
                            items: { orderBy: { lineNo: "asc" }, select: { id: true, lineNo: true, itemName: true, unit: true, quantity: true } },
                        },
                    },
                },
            },
        },
    },
};

const checkSelect = { id: true, sessionId: true, orderItemId: true, plannedQty: true, loadedQty: true, status: true, checkedAt: true, clientMutationId: true };

// ---- reads (pass a transaction to read inside it) ----

// page of loading tasks (trips) + total count for the same filter
export const listTasks = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.trip.findMany({
            where,
            orderBy: [{ vehicle: { code: "asc" } }, { tripNumber: "asc" }],
            skip,
            take,
            select: taskListSelect,
        }),
        db.trip.count({ where }),
    ]);
    return { rows, total };
};

export const findTaskDetail = async (tripId, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.findUnique({ where: { id: tripId }, select: taskDetailSelect });
};

// item checks of several sessions grouped by session and status, with their unit totals
export const countChecksBySession = async (sessionIds) => {
    return getPrisma().loadingItemCheck.groupBy({
        by: ["sessionId", "status"],
        where: { sessionId: { in: sessionIds } },
        _count: { _all: true },
        _sum: { plannedQty: true, loadedQty: true },
    });
};

// item checks of the trips matching a filter, grouped by status
export const countChecksByStatus = async (tripWhere) => {
    return getPrisma().loadingItemCheck.groupBy({
        by: ["status"],
        where: { session: { trip: tripWhere } },
        _count: { _all: true },
        _sum: { plannedQty: true, loadedQty: true },
    });
};

export const countTripsByStatus = async (tripWhere) => {
    return getPrisma().trip.groupBy({ by: ["status"], where: tripWhere, _count: { _all: true } });
};

// item checks of one trip grouped by status (progress after a change)
export const countTripChecksByStatusTx = (tx, tripId) => {
    return tx.loadingItemCheck.groupBy({
        by: ["status"],
        where: { session: { tripId } },
        _count: { _all: true },
        _sum: { plannedQty: true, loadedQty: true },
    });
};

export const findCheckTx = (tx, { tripId, orderItemId }) => {
    return tx.loadingItemCheck.findFirst({ where: { orderItemId, session: { tripId } }, select: checkSelect });
};

// the check a client mutation id was used on, with the trip it belongs to
export const findCheckByClientMutationIdTx = (tx, clientMutationId) => {
    return tx.loadingItemCheck.findUnique({
        where: { clientMutationId },
        select: { ...checkSelect, session: { select: { tripId: true } } },
    });
};

// every check of a trip with the order each item belongs to
export const listTripChecksTx = (tx, tripId) => {
    return tx.loadingItemCheck.findMany({
        where: { session: { tripId } },
        select: {
            orderItemId: true,
            plannedQty: true,
            loadedQty: true,
            status: true,
            orderItem: { select: { orderId: true, itemName: true, unit: true } },
        },
    });
};

// how many order items the trip carries (every one of them needs a check)
export const countTripItemsTx = (tx, tripId) => {
    return tx.orderItem.count({ where: { order: { allocation: { stop: { tripId } } } } });
};

// ---- writes ----

// Locks the trip's loading session until the transaction ends, so item checks and the completion of one
// trip cannot interleave. Returns false when the trip has no session.
export const lockSessionTx = async (tx, tripId) => {
    const rows = await tx.$queryRaw`SELECT "id" FROM "LoadingSession" WHERE "tripId" = ${tripId} FOR UPDATE`;
    return rows.length > 0;
};

// start or completion of a trip's loading session
export const updateSessionTx = (tx, tripId, data) => {
    return tx.loadingSession.update({ where: { tripId }, data, select: { id: true } });
};

export const updateCheckTx = (tx, id, data) => {
    return tx.loadingItemCheck.update({ where: { id }, data, select: checkSelect });
};

// the loading check of each given order item
export const findChecksByItemsTx = (tx, orderItemIds) => {
    return tx.loadingItemCheck.findMany({
        where: { orderItemId: { in: orderItemIds } },
        select: { orderItemId: true, plannedQty: true, loadedQty: true, status: true },
    });
};
