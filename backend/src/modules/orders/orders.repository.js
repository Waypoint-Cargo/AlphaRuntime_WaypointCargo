import { getPrisma } from "../../config/database.js";

const outletRef = { select: { id: true, code: true, name: true } };

const orderSummarySelect = {
    id: true,
    reference: true,
    outletId: true,
    outlet: outletRef,
    depotId: true,
    brand: true,
    tempClass: true,
    requestedDeliveryDate: true,
    deliveryDate: true,
    rolledOver: true,
    status: true,
    totalWeightKg: true,
    totalVolumeM3: true,
    itemCount: true,
    isFragile: true,
    isHighValue: true,
    cutoffAt: true,
    submittedAt: true,
    confirmedAt: true,
    cancelledAt: true,
    version: true,
    createdAt: true,
    updatedAt: true,
};

const orderDetailSelect = {
    ...orderSummarySelect,
    windowStartMin: true,
    windowEndMin: true,
    vanOnly: true,
    isMall: true,
    unloadingType: true,
    specialInstructions: true,
    createdById: true,
    items: {
        orderBy: { lineNo: "asc" },
        select: { id: true, lineNo: true, itemName: true, sku: true, unit: true, quantity: true, weightKg: true, volumeM3: true, notes: true },
    },
    events: {
        orderBy: { occurredAt: "asc" },
        select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            reason: true,
            data: true,
            occurredAt: true,
            actor: { select: { id: true, fullName: true } },
        },
    },
    allocation: {
        select: {
            allocatedAt: true,
            stop: {
                select: {
                    sequence: true,
                    predictedArrival: true,
                    trip: {
                        select: { id: true, code: true, tripNumber: true, status: true, vehicle: { select: { id: true, code: true } } },
                    },
                },
            },
        },
    },
    deferrals: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, reason: true, note: true, fromDate: true, toDate: true, decidedAt: true },
    },
    receipt: { select: { status: true, confirmedAt: true } },
};

// the fields the business rules need (status machine, edits, checks)
const orderCoreSelect = {
    id: true,
    reference: true,
    outletId: true,
    depotId: true,
    brand: true,
    status: true,
    version: true,
    tempClass: true,
    requestedDeliveryDate: true,
    deliveryDate: true,
    rolledOver: true,
    cutoffAt: true,
    totalWeightKg: true,
    totalVolumeM3: true,
    itemCount: true,
};

// what the allocation engine needs about an order
const orderPlanningSelect = {
    id: true,
    reference: true,
    outletId: true,
    depotId: true,
    status: true,
    requestedDeliveryDate: true,
    deliveryDate: true,
    tempClass: true,
    totalWeightKg: true,
    totalVolumeM3: true,
    vanOnly: true,
    isMall: true,
    windowStartMin: true,
    windowEndMin: true,
    allocation: { select: { id: true } },
};

// the plan queue shows more of the outlet than a normal order does
const queueOrderSelect = {
    id: true,
    reference: true,
    status: true,
    tempClass: true,
    brand: true,
    deliveryDate: true,
    requestedDeliveryDate: true,
    rolledOver: true,
    totalWeightKg: true,
    totalVolumeM3: true,
    itemCount: true,
    isFragile: true,
    isHighValue: true,
    specialInstructions: true,
    outlet: {
        select: {
            id: true,
            code: true,
            name: true,
            district: true,
            vanOnly: true,
            isMall: true,
            windowStartMin: true,
            windowEndMin: true,
            mallAccessStartMin: true,
            mallAccessEndMin: true,
            unloadingType: true,
        },
    },
    allocation: {
        select: {
            stop: {
                select: {
                    sequence: true,
                    predictedArrival: true,
                    trip: { select: { id: true, code: true, tripNumber: true, vehicle: { select: { id: true, code: true } } } },
                },
            },
        },
    },
};

// ---- reads (pass a transaction to read inside it) ----

export const findOrderCore = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.order.findUnique({ where: { id }, select: orderCoreSelect });
};

export const findOrderDetailById = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.order.findUnique({ where: { id }, select: orderDetailSelect });
};

export const findOrderForPlanning = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.order.findUnique({ where: { id }, select: orderPlanningSelect });
};

export const findOrderStatusesTx = (tx, ids) => {
    return tx.order.findMany({ where: { id: { in: ids } }, select: { id: true, reference: true, status: true } });
};

// page of orders + total count for the same filter (newest first)
export const listOrders = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.order.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take,
            select: orderSummarySelect,
        }),
        db.order.count({ where }),
    ]);
    return { rows, total };
};

// counts by status and by brand for the same filter
export const countOrdersByStatusAndBrand = async (where) => {
    const db = getPrisma();
    const [byStatus, byBrand] = await db.$transaction([
        db.order.groupBy({ by: ["status"], where, _count: { _all: true } }),
        db.order.groupBy({ by: ["brand"], where, _count: { _all: true } }),
    ]);
    return { byStatus, byBrand };
};

export const countOrdersByStatus = async (where, tx) => {
    const client = tx ?? getPrisma();
    return client.order.groupBy({ by: ["status"], where, _count: { _all: true } });
};

// orders of a depot and date waiting for planning (queue) and, separately, their same-outlet siblings
export const listQueueOrders = async (where, tx) => {
    const client = tx ?? getPrisma();
    return client.order.findMany({
        where,
        orderBy: [{ outlet: { code: "asc" } }, { reference: "asc" }],
        select: queueOrderSelect,
    });
};

export const listOrdersOfDepotDate = async ({ depotId, deliveryDate, statuses }, tx) => {
    const client = tx ?? getPrisma();
    return client.order.findMany({
        where: { depotId, deliveryDate, status: { in: statuses } },
        select: { id: true, outletId: true, reference: true, tempClass: true, status: true },
    });
};

// ---- writes ----

// next value of order_ref_seq (the sequence lives in the business-constraints migration)
export const nextOrderNumberTx = async (tx) => {
    const rows = await tx.$queryRaw`SELECT nextval('order_ref_seq')::int AS "value"`;
    return rows[0].value;
};

export const createOrderTx = (tx, data) => {
    return tx.order.create({ data, select: { id: true } });
};

export const createOrderEventTx = (tx, data) => {
    return tx.orderEvent.create({ data, select: { id: true } });
};

export const updateOrderFieldsTx = (tx, id, data) => {
    return tx.order.update({ where: { id }, data, select: { id: true } });
};

// Optimistic-locking edit: only applies while the version still matches and the order is editable.
// { count: 0 } means someone else changed it.
export const updateOrderEditTx = (tx, { id, version, statuses, data }) => {
    return tx.order.updateMany({
        where: { id, version, status: { in: statuses } },
        data: { ...data, version: { increment: 1 } },
    });
};

export const replaceOrderItemsTx = async (tx, orderId, items) => {
    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.orderItem.createMany({ data: items.map((item) => ({ ...item, orderId })) });
};

// Compare-and-set of the status. { count: 0 } means the status changed since it was read.
export const updateOrderStatusTx = (tx, id, fromStatus, toStatus) => {
    return tx.order.updateMany({ where: { id, status: fromStatus }, data: { status: toStatus } });
};

// ---- prompt 3: what issues, receipts and deliveries need to know about an order ----

const orderRefSelect = {
    id: true,
    reference: true,
    outletId: true,
    depotId: true,
    status: true,
    deliveryDate: true,
    items: { orderBy: { lineNo: "asc" }, select: { id: true, lineNo: true, itemName: true, unit: true, quantity: true } },
    allocation: { select: { stopId: true, stop: { select: { tripId: true, trip: { select: { driverId: true } } } } } },
    receipt: { select: { status: true, confirmedAt: true } },
};

export const findOrderRef = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.order.findUnique({ where: { id }, select: orderRefSelect });
};
