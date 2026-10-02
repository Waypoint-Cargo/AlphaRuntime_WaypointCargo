import { getPrisma } from "../../config/database.js";

const outletWindow = {
    id: true,
    code: true,
    name: true,
    isMall: true,
    windowStartMin: true,
    windowEndMin: true,
    mallAccessStartMin: true,
    mallAccessEndMin: true,
};

// ---- pings ----

// pings already stored for a trip inside a time range, to skip the ones a retry sends again
export const findPingKeysTx = (tx, { tripId, from, to }) => {
    return tx.locationPing.findMany({
        where: { tripId, recordedAt: { gte: from, lte: to } },
        select: { recordedAt: true, lat: true, lng: true },
    });
};

export const createPingsTx = (tx, rows) => {
    return tx.locationPing.createMany({ data: rows });
};

// the newest pings of a trip, newest first
export const findRecentPings = async ({ tripId, take }) => {
    return getPrisma().locationPing.findMany({
        where: { tripId },
        orderBy: { recordedAt: "desc" },
        take,
        select: { lat: true, lng: true, speedKmh: true, recordedAt: true },
    });
};

// the newest ping of each trip: [{ tripId, lat, lng, recordedAt }]
export const findLastPings = async (tripIds) => {
    if (tripIds.length === 0) return [];
    return getPrisma().$queryRaw`
        SELECT DISTINCT ON ("tripId") "tripId", "lat"::float8 AS "lat", "lng"::float8 AS "lng", "recordedAt"
        FROM "LocationPing"
        WHERE "tripId" = ANY(${tripIds}::text[])
        ORDER BY "tripId", "recordedAt" DESC`;
};

// ---- live view of a depot's day ----

const liveStopSelect = {
    id: true,
    sequence: true,
    status: true,
    predictedArrival: true,
    outlet: { select: outletWindow },
};

// trips of the depots on a date that are loaded, on the road or finished
export const findLiveTrips = async ({ depotIds, deliveryDate }) => {
    return getPrisma().trip.findMany({
        where: { deliveryDate, plan: { depotId: { in: depotIds } }, status: { in: ["LOADED", "IN_TRANSIT", "COMPLETED"] } },
        orderBy: [{ vehicle: { code: "asc" } }, { tripNumber: "asc" }],
        select: {
            id: true,
            code: true,
            tripNumber: true,
            status: true,
            plan: { select: { depotId: true } },
            vehicle: { select: { id: true, code: true } },
            driver: { select: { id: true, fullName: true, phone: true } },
            stops: { orderBy: { sequence: "asc" }, select: liveStopSelect },
        },
    });
};

// orders delivered (in full or in part) whose stop was completed inside a time range
export const countOrdersDeliveredBetween = async ({ depotIds, from, to }) => {
    return getPrisma().order.count({
        where: {
            depotId: { in: depotIds },
            status: { in: ["DELIVERED", "PARTIALLY_DELIVERED"] },
            allocation: { stop: { completedAt: { gte: from, lt: to } } },
        },
    });
};

// ---- the store manager's view ----

// published trips of a date that have a stop at the outlet (other outlets' stops are only counted)
export const findOutletTrips = async ({ outletId, deliveryDate }) => {
    return getPrisma().trip.findMany({
        where: {
            deliveryDate,
            status: { not: "CANCELLED" },
            plan: { status: { in: ["PUBLISHED", "IN_EXECUTION", "COMPLETED"] } },
            stops: { some: { outletId } },
        },
        orderBy: [{ tripNumber: "asc" }, { code: "asc" }],
        select: {
            id: true,
            code: true,
            status: true,
            vehicle: { select: { code: true } },
            driver: { select: { fullName: true } },
            stops: {
                orderBy: { sequence: "asc" },
                select: {
                    id: true,
                    outletId: true,
                    sequence: true,
                    status: true,
                    predictedArrival: true,
                    arrivedAt: true,
                    completedAt: true,
                    outlet: { select: outletWindow },
                },
            },
        },
    });
};

// ---- one trip ----

export const findTripStops = async (tripId) => {
    return getPrisma().stop.findMany({
        where: { tripId },
        orderBy: { sequence: "asc" },
        select: {
            id: true,
            sequence: true,
            status: true,
            predictedArrival: true,
            arrivedAt: true,
            unloadingStartedAt: true,
            completedAt: true,
            failureReason: true,
            outlet: { select: outletWindow },
        },
    });
};
