import { getPrisma } from "../../config/database.js";

const receiptSelect = {
    orderId: true,
    status: true,
    confirmedAt: true,
    note: true,
    confirmedBy: { select: { id: true, fullName: true } },
};

export const createReceiptTx = (tx, data) => {
    return tx.receipt.create({ data, select: receiptSelect });
};

// the proof of delivery of the stop an order was delivered at
export const findOrderProof = async (orderId) => {
    return getPrisma().proofOfDelivery.findFirst({
        where: { stop: { allocations: { some: { orderId } } } },
        select: {
            receiverName: true,
            capturedAtDevice: true,
            receivedAt: true,
            allDeliveredAsPlanned: true,
            signatureFileId: true,
            photos: { select: { fileId: true } },
            stop: { select: { id: true, sequence: true, status: true, arrivedAt: true, completedAt: true } },
        },
    });
};

// the quantity delivered of each item of an order, next to what was ordered
export const findDeliveredLines = async (orderId) => {
    return getPrisma().deliveredLine.findMany({
        where: { orderItem: { orderId } },
        orderBy: { orderItem: { lineNo: "asc" } },
        select: {
            orderItemId: true,
            deliveredQty: true,
            note: true,
            orderItem: { select: { lineNo: true, itemName: true, unit: true, quantity: true } },
        },
    });
};
