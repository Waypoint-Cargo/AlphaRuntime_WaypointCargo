// Allocation rows. All of the allocation engine's writes run inside one transaction, so
// everything here takes the transaction.

const allocationSelect = {
    id: true,
    orderId: true,
    stopId: true,
    stop: {
        select: {
            id: true,
            sequence: true,
            tripId: true,
            trip: {
                select: {
                    id: true,
                    code: true,
                    tripNumber: true,
                    status: true,
                    vehicleId: true,
                    deliveryDate: true,
                    planId: true,
                    plan: { select: { id: true, status: true, depotId: true } },
                },
            },
        },
    },
};

export const findAllocationByOrderTx = (tx, orderId) => {
    return tx.allocation.findUnique({ where: { orderId }, select: allocationSelect });
};

export const createAllocationTx = (tx, data) => {
    return tx.allocation.create({ data, select: { id: true } });
};

export const deleteAllocationTx = (tx, id) => {
    return tx.allocation.delete({ where: { id } });
};

export const countStopAllocationsTx = (tx, stopId) => {
    return tx.allocation.count({ where: { stopId } });
};
