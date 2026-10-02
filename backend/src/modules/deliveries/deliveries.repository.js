import { getPrisma } from "../../config/database.js";

// ---- the route bundle ----

const outletSelect = {
    id: true,
    code: true,
    name: true,
    brand: true,
    district: true,
    address: true,
    lat: true,
    lng: true,
    phone: true,
    isMall: true,
    unloadingType: true,
    unloadingNotes: true,
    windowStartMin: true,
    windowEndMin: true,
    mallAccessStartMin: true,
    mallAccessEndMin: true,
};

const tripBundleSelect = {
    id: true,
    code: true,
    tripNumber: true,
    status: true,
    deliveryDate: true,
    plannedDeparture: true,
    plannedReturn: true,
    actualDeparture: true,
    actualReturn: true,
    updatedAt: true,
    plan: { select: { id: true, status: true, depot: { select: { id: true, code: true, name: true } } } },
    vehicle: { select: { id: true, code: true, type: true, isRefrigerated: true } },
    stops: {
        orderBy: { sequence: "asc" },
        select: {
            id: true,
            sequence: true,
            status: true,
            plannedArrival: true,
            predictedArrival: true,
            arrivedAt: true,
            unloadingStartedAt: true,
            completedAt: true,
            failureReason: true,
            outlet: { select: outletSelect },
            proof: { select: { receivedAt: true, allDeliveredAsPlanned: true } },
            deliveredLines: { select: { orderItemId: true, deliveredQty: true } },
            allocations: {
                select: {
                    order: {
                        select: {
                            id: true,
                            reference: true,
                            status: true,
                            specialInstructions: true,
                            updatedAt: true,
                            items: {
                                orderBy: { lineNo: "asc" },
                                select: {
                                    id: true,
                                    lineNo: true,
                                    itemName: true,
                                    unit: true,
                                    quantity: true,
                                    loadingChecks: { select: { plannedQty: true, loadedQty: true, status: true, checkedAt: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

// ---- reads (pass a transaction to read inside it) ----

// the driver's trips on a date, whose plans are in one of the given statuses, with everything the app needs
export const findDriverTrips = async ({ driverId, deliveryDate, planStatuses }, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.findMany({
        where: { driverId, deliveryDate, status: { not: "CANCELLED" }, plan: { status: { in: planStatuses } } },
        orderBy: [{ tripNumber: "asc" }, { vehicle: { code: "asc" } }],
        select: tripBundleSelect,
    });
};

export const findTripBundle = async (tripId, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.findUnique({ where: { id: tripId }, select: tripBundleSelect });
};

// the driver's stops of a day for the summary
export const findDriverStops = async ({ driverId, deliveryDate, planStatuses }) => {
    return getPrisma().stop.findMany({
        where: { trip: { driverId, deliveryDate, status: { not: "CANCELLED" }, plan: { status: { in: planStatuses } } } },
        orderBy: [{ trip: { tripNumber: "asc" } }, { sequence: "asc" }],
        select: {
            id: true,
            sequence: true,
            status: true,
            predictedArrival: true,
            arrivedAt: true,
            outlet: { select: { id: true, code: true, name: true, isMall: true, windowEndMin: true, mallAccessEndMin: true } },
            trip: { select: { id: true, code: true, tripNumber: true, status: true } },
        },
    });
};

// a stop as it is now, for the answer to an event or a proof
export const findStopState = async (stopId, tx) => {
    const client = tx ?? getPrisma();
    return client.stop.findUnique({
        where: { id: stopId },
        select: {
            id: true,
            tripId: true,
            sequence: true,
            status: true,
            arrivedAt: true,
            unloadingStartedAt: true,
            completedAt: true,
            failureReason: true,
            proof: { select: { receivedAt: true, allDeliveredAsPlanned: true } },
            trip: { select: { code: true, status: true, plan: { select: { status: true } } } },
            allocations: { select: { order: { select: { id: true, reference: true, status: true } } } },
        },
    });
};

export const findStopEventByClientMutationId = async (clientMutationId, tx) => {
    const client = tx ?? getPrisma();
    return client.stopEvent.findUnique({ where: { clientMutationId }, select: { id: true, stopId: true, actorId: true } });
};

export const findProofByClientMutationId = async (clientMutationId, tx) => {
    const client = tx ?? getPrisma();
    return client.proofOfDelivery.findUnique({ where: { clientMutationId }, select: { id: true, stopId: true, driverId: true } });
};

// ---- writes ----

export const createStopEventTx = (tx, data) => {
    return tx.stopEvent.create({ data, select: { id: true } });
};

export const createProofTx = (tx, data) => {
    return tx.proofOfDelivery.create({ data, select: { id: true } });
};

export const createPodPhotosTx = (tx, podId, fileIds) => {
    return tx.podPhoto.createMany({ data: fileIds.map((fileId) => ({ podId, fileId })) });
};

export const createDeliveredLinesTx = (tx, stopId, lines) => {
    return tx.deliveredLine.createMany({
        data: lines.map((line) => ({ stopId, orderItemId: line.orderItemId, deliveredQty: line.deliveredQty, note: line.note ?? null })),
    });
};
