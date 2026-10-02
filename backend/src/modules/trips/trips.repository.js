import { getPrisma } from "../../config/database.js";

const TEMP_SEQUENCE = 20_000; // parking value for a new stop that is about to be placed

const tripSummarySelect = {
    id: true,
    code: true,
    planId: true,
    plan: { select: { id: true, depotId: true, status: true } },
    vehicle: { select: { id: true, code: true, type: true, isRefrigerated: true, maxWeightKg: true, maxVolumeM3: true } },
    driver: { select: { id: true, fullName: true } },
    deliveryDate: true,
    tripNumber: true,
    status: true,
    plannedWeightKg: true,
    plannedVolumeM3: true,
    plannedDistanceKm: true,
    plannedFuelL: true,
    plannedDeparture: true,
    plannedReturn: true,
    _count: { select: { stops: true } },
};

const tripDetailSelect = {
    ...tripSummarySelect,
    plan: { select: { id: true, depotId: true, status: true, depot: { select: { id: true, code: true, name: true } } } },
    stops: {
        orderBy: { sequence: "asc" },
        select: {
            id: true,
            sequence: true,
            status: true,
            plannedArrival: true,
            predictedArrival: true,
            legDistanceKm: true,
            outlet: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    district: true,
                    address: true,
                    lat: true,
                    lng: true,
                    isMall: true,
                    vanOnly: true,
                    windowStartMin: true,
                    windowEndMin: true,
                    mallAccessStartMin: true,
                    mallAccessEndMin: true,
                    unloadingType: true,
                    unloadingNotes: true,
                },
            },
            allocations: {
                select: {
                    order: {
                        select: { id: true, reference: true, tempClass: true, totalWeightKg: true, totalVolumeM3: true, itemCount: true },
                    },
                },
            },
        },
    },
};

const tripCoreSelect = {
    id: true,
    code: true,
    status: true,
    planId: true,
    plan: { select: { id: true, depotId: true, status: true, deliveryDate: true } },
    vehicleId: true,
    driverId: true,
    deliveryDate: true,
    tripNumber: true,
};

// everything needed to total a trip: vehicle fuel profile, depot position, stops with outlet geography and orders
const tripTotalsSelect = {
    id: true,
    vehicle: { select: { fuelKmPerLitre: true } },
    plan: { select: { depot: { select: { lat: true, lng: true } } } },
    stops: {
        orderBy: { sequence: "asc" },
        select: {
            id: true,
            outlet: { select: { district: true, lat: true, lng: true, sourceAttributes: true } },
            allocations: { select: { order: { select: { totalWeightKg: true, totalVolumeM3: true } } } },
        },
    },
};

// ---- reads (pass a transaction to read inside it) ----

export const findTripCore = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.findUnique({ where: { id }, select: tripCoreSelect });
};

export const findTripDetail = async (id) => {
    const db = getPrisma();
    return db.trip.findUnique({ where: { id }, select: tripDetailSelect });
};

export const findTripForTotalsTx = (tx, id) => {
    return tx.trip.findUnique({ where: { id }, select: tripTotalsSelect });
};

// page of trips + total count for the same filter
export const listTrips = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.trip.findMany({
            where,
            orderBy: [{ deliveryDate: "asc" }, { vehicle: { code: "asc" } }, { tripNumber: "asc" }],
            skip,
            take,
            select: tripSummarySelect,
        }),
        db.trip.count({ where }),
    ]);
    return { rows, total };
};

export const listTripsOfPlan = async (planId) => {
    const db = getPrisma();
    return db.trip.findMany({
        where: { planId },
        orderBy: [{ vehicle: { code: "asc" } }, { tripNumber: "asc" }],
        select: tripSummarySelect,
    });
};

export const findVehicleTripsOnDate = async (vehicleId, deliveryDate) => {
    const db = getPrisma();
    return db.trip.findMany({
        where: { vehicleId, deliveryDate },
        orderBy: { tripNumber: "asc" },
        select: { id: true, code: true, tripNumber: true, status: true, plannedWeightKg: true, plannedVolumeM3: true },
    });
};

// distinct vehicles that have a (non-cancelled) trip on the date, and those with a trip in transit
export const countVehiclesWithTripsOnDate = async ({ depotIds, deliveryDate }) => {
    const db = getPrisma();
    const vehicle = depotIds ? { homeDepotId: { in: depotIds } } : {};
    const [withTrips, inTransit] = await db.$transaction([
        db.trip.groupBy({ by: ["vehicleId"], where: { deliveryDate, status: { not: "CANCELLED" }, vehicle } }),
        db.trip.groupBy({ by: ["vehicleId"], where: { deliveryDate, status: "IN_TRANSIT", vehicle } }),
    ]);
    return { withTrips: withTrips.length, inTransit: inTransit.length };
};

// active vehicles of the depots (null = all) that have at least minTrips trips on a date
export const countVehiclesWithAtLeastTrips = async ({ depotIds, deliveryDate, minTrips }) => {
    const db = getPrisma();
    const groups = await db.trip.groupBy({
        by: ["vehicleId"],
        where: {
            deliveryDate,
            status: { not: "CANCELLED" },
            vehicle: { isActive: true, ...(depotIds && { homeDepotId: { in: depotIds } }) },
        },
        _count: { _all: true },
    });
    return groups.filter((group) => group._count._all >= minTrips).length;
};

// all trips of a depot on a date with their stops: the allocation engine's view of the day
export const findDepotTripsForDate = async ({ depotId, deliveryDate }, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.findMany({
        where: { deliveryDate, plan: { depotId }, status: { not: "CANCELLED" } },
        select: {
            id: true,
            code: true,
            planId: true,
            plan: { select: { status: true, depot: { select: { lat: true, lng: true } } } },
            vehicleId: true,
            tripNumber: true,
            status: true,
            plannedWeightKg: true,
            plannedVolumeM3: true,
            plannedDistanceKm: true,
            plannedFuelL: true,
            stops: {
                orderBy: { sequence: "asc" },
                select: {
                    id: true,
                    sequence: true,
                    outletId: true,
                    predictedArrival: true,
                    outlet: { select: { district: true, lat: true, lng: true, sourceAttributes: true } },
                },
            },
        },
    });
};

// planned fuel of trips whose plans are not published yet, summed per vehicle for one ISO week
export const sumUnpublishedPlannedFuel = async ({ vehicleIds, weekStart, weekEnd }, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.groupBy({
        by: ["vehicleId"],
        where: {
            vehicleId: { in: vehicleIds },
            deliveryDate: { gte: weekStart, lte: weekEnd },
            status: { not: "CANCELLED" },
            plan: { status: { in: ["OPEN", "CLOSED", "DRAFT"] } },
        },
        _sum: { plannedFuelL: true },
    });
};

// ---- trip and stop writes (used by the allocation engine and by trips itself) ----

export const findTripBySlotTx = (tx, { vehicleId, deliveryDate, tripNumber }) => {
    return tx.trip.findUnique({
        where: { vehicleId_deliveryDate_tripNumber: { vehicleId, deliveryDate, tripNumber } },
        select: { id: true, code: true, planId: true, status: true, driverId: true },
    });
};

// next value of trip_code_seq (the sequence lives in the business-constraints migration)
export const nextTripNumberTx = async (tx) => {
    const rows = await tx.$queryRaw`SELECT nextval('trip_code_seq')::int AS "value"`;
    return rows[0].value;
};

export const createTripTx = (tx, data) => {
    return tx.trip.create({ data, select: { id: true, code: true } });
};

export const listTripStopsTx = (tx, tripId) => {
    return tx.stop.findMany({ where: { tripId }, orderBy: { sequence: "asc" }, select: { id: true, sequence: true, status: true, outletId: true } });
};

export const findStopForOutletTx = (tx, { tripId, outletId }) => {
    return tx.stop.findUnique({ where: { tripId_outletId: { tripId, outletId } }, select: { id: true, sequence: true } });
};

// A new stop at the end, or parked at a high sequence when it will be placed by reorderStopsTx.
export const createStopTx = (tx, { tripId, outletId, sequence }) => {
    return tx.stop.create({ data: { tripId, outletId, sequence: sequence ?? TEMP_SEQUENCE }, select: { id: true, sequence: true } });
};

export const deleteStopTx = (tx, id) => {
    return tx.stop.delete({ where: { id } });
};

export const deleteTripTx = (tx, id) => {
    return tx.trip.delete({ where: { id } });
};

// Puts the trip's stops in the given order as 1..n. (tripId, sequence) is unique, so it
// works in two passes: first every stop moves out of the way (+1000), then each gets its final number.
export const reorderStopsTx = async (tx, tripId, orderedStopIds) => {
    await tx.stop.updateMany({ where: { tripId }, data: { sequence: { increment: 1000 } } });
    for (let index = 0; index < orderedStopIds.length; index++) {
        await tx.stop.update({ where: { id: orderedStopIds[index] }, data: { sequence: index + 1 } });
    }
};

export const updateTripTotalsTx = (tx, id, data) => {
    return tx.trip.update({ where: { id }, data, select: { id: true } });
};

export const updateStopLegDistancesTx = async (tx, legs) => {
    for (const leg of legs) {
        await tx.stop.update({ where: { id: leg.id }, data: { legDistanceKm: leg.legDistanceKm } });
    }
};

export const updateTripDriverTx = (tx, id, driverId) => {
    return tx.trip.update({ where: { id }, data: { driverId }, select: { id: true } });
};

// ---- sequence-change requests ----

const sequenceRequestSelect = {
    id: true,
    tripId: true,
    trip: { select: { id: true, code: true, status: true, driverId: true, plan: { select: { depotId: true, status: true } } } },
    requestedById: true,
    requestedBy: { select: { id: true, fullName: true } },
    proposedSequence: true,
    reason: true,
    status: true,
    decidedById: true,
    decidedAt: true,
    createdAt: true,
};

export const findPendingSequenceRequest = async (tripId, tx) => {
    const client = tx ?? getPrisma();
    return client.sequenceChangeRequest.findFirst({ where: { tripId, status: "PENDING" }, select: { id: true } });
};

export const createSequenceRequestTx = (tx, data) => {
    return tx.sequenceChangeRequest.create({ data, select: sequenceRequestSelect });
};

export const findSequenceRequestById = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.sequenceChangeRequest.findUnique({ where: { id }, select: sequenceRequestSelect });
};

export const listSequenceRequests = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.sequenceChangeRequest.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take,
            select: sequenceRequestSelect,
        }),
        db.sequenceChangeRequest.count({ where }),
    ]);
    return { rows, total };
};

// Only succeeds while the request is still PENDING ({ count: 0 } = someone decided it already).
export const decideSequenceRequestTx = (tx, { id, status, decidedById }) => {
    return tx.sequenceChangeRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status, decidedById, decidedAt: new Date() },
    });
};

// ---- prompt 3: references, status writes, orders of a trip or stop ----

const tripRefSelect = {
    id: true,
    code: true,
    status: true,
    planId: true,
    plan: { select: { id: true, status: true, depotId: true, deliveryDate: true } },
    vehicleId: true,
    driverId: true,
    tripNumber: true,
    deliveryDate: true,
    actualDeparture: true,
};

const stopRefSelect = {
    id: true,
    tripId: true,
    outletId: true,
    outlet: {
        select: { code: true, name: true, brand: true, isMall: true, windowStartMin: true, windowEndMin: true, mallAccessStartMin: true, mallAccessEndMin: true },
    },
    sequence: true,
    status: true,
    arrivedAt: true,
    unloadingStartedAt: true,
    completedAt: true,
    failureReason: true,
    trip: { select: tripRefSelect },
};

export const findTripRef = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.findUnique({ where: { id }, select: tripRefSelect });
};

export const findStopRef = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.stop.findUnique({ where: { id }, select: stopRefSelect });
};

export const findTripStatusTx = (tx, id) => {
    return tx.trip.findUnique({ where: { id }, select: { id: true, code: true, status: true, planId: true } });
};

// Compare-and-set of a trip's status. { count: 0 } = the status changed since it was read.
export const updateTripStatusTx = (tx, id, fromStatus, data) => {
    return tx.trip.updateMany({ where: { id, status: fromStatus }, data });
};

// is another trip of this vehicle on the road?
export const findVehicleTripInTransit = async ({ vehicleId, excludeTripId }, tx) => {
    const client = tx ?? getPrisma();
    return client.trip.findFirst({
        where: { vehicleId, status: "IN_TRANSIT", id: { not: excludeTripId } },
        select: { id: true, code: true },
    });
};

// the orders on a trip, with the stop they are delivered at
export const findTripOrdersTx = (tx, tripId) => {
    return tx.allocation.findMany({
        where: { stop: { tripId } },
        select: { stopId: true, order: { select: { id: true, reference: true, status: true, outletId: true } } },
    });
};

// the orders at one stop with their lines
export const findStopOrdersWithItemsTx = (tx, stopId) => {
    return tx.allocation.findMany({
        where: { stopId },
        select: {
            order: {
                select: {
                    id: true,
                    reference: true,
                    status: true,
                    outletId: true,
                    items: { orderBy: { lineNo: "asc" }, select: { id: true, lineNo: true, itemName: true, unit: true, quantity: true } },
                },
            },
        },
    });
};

// Compare-and-set of a stop's status. { count: 0 } = the stop was not in one of the expected states.
export const updateStopStatusTx = (tx, { id, fromStatuses, data }) => {
    return tx.stop.updateMany({ where: { id, status: { in: fromStatuses } }, data });
};

export const listTripStopStatusesTx = (tx, tripId) => {
    return tx.stop.findMany({ where: { tripId }, select: { id: true, status: true } });
};
