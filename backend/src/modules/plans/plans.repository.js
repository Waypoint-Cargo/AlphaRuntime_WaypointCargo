import { getPrisma } from "../../config/database.js";

const planSelect = {
    id: true,
    depotId: true,
    depot: { select: { id: true, code: true, name: true, lat: true, lng: true } },
    deliveryDate: true,
    status: true,
    closedAt: true,
    closedById: true,
    publishedAt: true,
    publishedById: true,
    version: true,
    createdAt: true,
    updatedAt: true,
};

// ---- reads (pass a transaction to read inside it) ----

export const findPlanById = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.dispatchPlan.findUnique({ where: { id }, select: planSelect });
};

export const findPlanByDepotDate = async ({ depotId, deliveryDate }, tx) => {
    const client = tx ?? getPrisma();
    return client.dispatchPlan.findUnique({
        where: { depotId_deliveryDate: { depotId, deliveryDate } },
        select: planSelect,
    });
};

// page of plans + total count for the same filter (newest date first)
export const listPlans = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.dispatchPlan.findMany({
            where,
            orderBy: [{ deliveryDate: "desc" }, { depot: { code: "asc" } }],
            skip,
            take,
            select: planSelect,
        }),
        db.dispatchPlan.count({ where }),
    ]);
    return { rows, total };
};

// ---- locking and plan writes ----

// Serialises everything that changes a plan's trips, stops and allocations: held until the
// transaction ends. (pg_advisory_xact_lock returns void, which Prisma cannot read, so it is wrapped.)
export const lockPlanTx = async (tx, planId) => {
    await tx.$queryRaw`SELECT 1 AS "locked" FROM (SELECT pg_advisory_xact_lock(hashtext(${planId}))) AS plan_lock`;
};

export const createPlanTx = (tx, data) => {
    return tx.dispatchPlan.create({ data, select: planSelect });
};

export const updatePlanTx = (tx, id, data) => {
    return tx.dispatchPlan.update({ where: { id }, data, select: planSelect });
};

// the plan becomes (or stays) a DRAFT after an allocation change; the version moves on
export const markPlanDraftTx = (tx, id) => {
    return tx.dispatchPlan.update({
        where: { id },
        data: { status: "DRAFT", version: { increment: 1 } },
        select: { id: true },
    });
};

// ---- publishing ----

// every live trip of the plan with what publishing needs: its stops, the orders on them and their items
export const findPlanTripsForPublishTx = (tx, planId) => {
    return tx.trip.findMany({
        where: { planId, status: { not: "CANCELLED" } },
        orderBy: [{ vehicle: { code: "asc" } }, { tripNumber: "asc" }],
        select: {
            id: true,
            code: true,
            tripNumber: true,
            vehicleId: true,
            vehicle: {
                select: {
                    id: true,
                    code: true,
                    type: true,
                    isRefrigerated: true,
                    isActive: true,
                    homeDepotId: true,
                    maxWeightKg: true,
                    maxVolumeM3: true,
                    weeklyFuelQuotaL: true,
                },
            },
            driverId: true,
            deliveryDate: true,
            plannedDistanceKm: true,
            plannedFuelL: true,
            stops: {
                orderBy: { sequence: "asc" },
                select: {
                    id: true,
                    allocations: {
                        select: {
                            order: {
                                select: {
                                    id: true,
                                    reference: true,
                                    outletId: true,
                                    depotId: true,
                                    tempClass: true,
                                    vanOnly: true,
                                    totalWeightKg: true,
                                    totalVolumeM3: true,
                                    windowStartMin: true,
                                    windowEndMin: true,
                                    items: { select: { id: true, quantity: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });
};

// one loading session per trip, then one item check per order item (plannedQty = quantity)
export const createLoadingSessionsTx = async (tx, trips) => {
    const sessions = await tx.loadingSession.createManyAndReturn({
        data: trips.map((trip) => ({ tripId: trip.id })),
        select: { id: true, tripId: true },
    });
    const sessionByTrip = new Map(sessions.map((session) => [session.tripId, session.id]));

    const checks = trips.flatMap((trip) =>
        trip.stops.flatMap((stop) =>
            stop.allocations.flatMap(({ order }) =>
                order.items.map((item) => ({
                    sessionId: sessionByTrip.get(trip.id),
                    orderItemId: item.id,
                    plannedQty: item.quantity,
                })),
            ),
        ),
    );
    if (checks.length > 0) await tx.loadingItemCheck.createMany({ data: checks });
    return { sessions: sessions.length, itemChecks: checks.length };
};

// ---- prompt 3: execution ----

// trips of the plan that have not finished (neither COMPLETED nor CANCELLED)
export const countUnfinishedTripsTx = (tx, planId) => {
    return tx.trip.count({ where: { planId, status: { notIn: ["COMPLETED", "CANCELLED"] } } });
};
