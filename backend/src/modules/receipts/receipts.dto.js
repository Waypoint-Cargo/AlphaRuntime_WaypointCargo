export const toReceiptDTO = (receipt, order) => ({
    orderId: order.id,
    reference: order.reference,
    orderStatus: order.status,
    status: receipt.status,
    confirmedAt: receipt.confirmedAt,
    confirmedBy: receipt.confirmedBy,
    note: receipt.note ?? null,
});

// what was delivered to an order's outlet: who received it, when, what was signed and photographed,
// and the quantity delivered per item next to the quantity ordered
export const toOrderProofDTO = ({ order, proof, lines }) => ({
    orderId: order.id,
    reference: order.reference,
    orderStatus: order.status,
    receiver: { name: proof.receiverName },
    capturedAt: proof.capturedAtDevice,
    receivedAt: proof.receivedAt,
    allDeliveredAsPlanned: proof.allDeliveredAsPlanned,
    signatureFileId: proof.signatureFileId,
    photoFileIds: proof.photos.map((photo) => photo.fileId),
    lines: lines.map((line) => ({
        orderItemId: line.orderItemId,
        lineNo: line.orderItem.lineNo,
        itemName: line.orderItem.itemName,
        unit: line.orderItem.unit,
        orderedQty: line.orderItem.quantity,
        deliveredQty: line.deliveredQty,
        note: line.note ?? null,
    })),
    stop: {
        id: proof.stop.id,
        sequence: proof.stop.sequence,
        status: proof.stop.status,
        arrivedAt: proof.stop.arrivedAt ?? null,
        completedAt: proof.stop.completedAt ?? null,
    },
    receipt: order.receipt ? { status: order.receipt.status, confirmedAt: order.receipt.confirmedAt } : null,
});
