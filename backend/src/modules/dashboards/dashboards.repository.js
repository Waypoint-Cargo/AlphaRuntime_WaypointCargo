import { getPrisma } from "../../config/database.js";
import redis from "../../config/redis.js";
import { logger } from "../../config/logger.js";

// a dashboard is recomputed at most this often per user and query
const CACHE_TTL_SECONDS = 15;

// published plans: the trips of these are real work
const PUBLISHED_PLAN_STATUSES = ["PUBLISHED", "IN_EXECUTION", "COMPLETED"];

// ---- the cache (Redis; a dashboard is computed on every request while Redis is unavailable) ----

const cacheReady = () => Boolean(redis) && redis.status === "ready";

export const readCachedDashboard = async (key) => {
    if (!cacheReady()) return null;
    try {
        const raw = await redis.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        logger.warn("Dashboard cache read failed.", { message: error.message });
        return null;
    }
};

export const writeCachedDashboard = async (key, dashboard) => {
    if (!cacheReady()) return;
    try {
        await redis.set(key, JSON.stringify(dashboard), "EX", CACHE_TTL_SECONDS);
    } catch (error) {
        logger.warn("Dashboard cache write failed.", { message: error.message });
    }
};

// ---- dispatcher ----

// every stop of the depots' published trips on a date (cancelled trips left out)
export const findDayStops = async ({ depotIds, deliveryDate }) => {
    return getPrisma().stop.findMany({
        where: {
            trip: { deliveryDate, status: { not: "CANCELLED" }, plan: { depotId: { in: depotIds }, status: { in: PUBLISHED_PLAN_STATUSES } } },
        },
        orderBy: [{ trip: { code: "asc" } }, { sequence: "asc" }],
        select: {
            id: true,
            sequence: true,
            status: true,
            predictedArrival: true,
            failureReason: true,
            outlet: { select: { id: true, code: true, name: true, isMall: true, windowEndMin: true, mallAccessEndMin: true } },
            trip: { select: { id: true, code: true, status: true } },
        },
    });
};

// planned weight on the trips of refrigerated vehicles (cancelled trips left out)
export const sumRefrigeratedPlannedWeight = async ({ depotIds, deliveryDate }) => {
    const row = await getPrisma().trip.aggregate({
        _sum: { plannedWeightKg: true },
        where: { deliveryDate, status: { not: "CANCELLED" }, plan: { depotId: { in: depotIds } }, vehicle: { isRefrigerated: true } },
    });
    return row._sum.plannedWeightKg;
};

// stop order changes that wait for a decision, on trips of a date
export const findPendingSequenceRequests = async ({ depotIds, deliveryDate, take }) => {
    const db = getPrisma();
    const where = { status: "PENDING", trip: { deliveryDate, plan: { depotId: { in: depotIds } } } };
    const [rows, total] = await db.$transaction([
        db.sequenceChangeRequest.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take,
            select: { id: true, createdAt: true, trip: { select: { id: true, code: true } }, requestedBy: { select: { fullName: true } } },
        }),
        db.sequenceChangeRequest.count({ where }),
    ]);
    return { rows, total };
};

// ---- store manager ----

// the outlet's orders of a date with where they are on the road
export const findOutletDayOrders = async ({ outletId, deliveryDate }) => {
    return getPrisma().order.findMany({
        where: { outletId, deliveryDate, status: { notIn: ["DRAFT", "CANCELLED"] } },
        orderBy: { reference: "asc" },
        select: {
            id: true,
            reference: true,
            tempClass: true,
            status: true,
            windowStartMin: true,
            windowEndMin: true,
            outlet: { select: { windowStartMin: true, windowEndMin: true } },
            allocation: {
                select: {
                    stop: {
                        select: {
                            sequence: true,
                            predictedArrival: true,
                            trip: { select: { code: true, vehicle: { select: { code: true } }, driver: { select: { fullName: true } } } },
                        },
                    },
                },
            },
        },
    });
};
