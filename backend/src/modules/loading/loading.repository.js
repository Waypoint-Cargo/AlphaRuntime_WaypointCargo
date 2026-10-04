import { getPrisma } from "../../config/database.js";
import {
    OPEN_SESSION_STATUSES,
    PENDING_TRIP_STATUSES,
    VISIBLE_PLAN_STATUSES,
} from "./loading.rules.js";

const userSelect = { id: true, fullName: true };
const depotSelect = { id: true, code: true, name: true };

const vehicleSelect = {
    id: true,
    code: true,
    type: true,
    isRefrigerated: true,
    maxWeightKg: true,
    maxVolumeM3: true,
    status: true,
    isActive: true,
};

const outletSelect = {
    id: true,
    code: true,
    name: true,
    district: true,
    brand: true,
    vanOnly: true,
    isMall: true,
    unloadingType: true,
    windowStartMin: true,
    windowEndMin: true,
    mallAccessStartMin: true,
    mallAccessEndMin: true,
};

const orderSelect = {
    id: true,
    reference: true,
    status: true,
    brand: true,
    tempClass: true,
    totalWeightKg: true,
    totalVolumeM3: true,
    vanOnly: true,
    windowStartMin: true,
    windowEndMin: true,
    items: {
        orderBy: { lineNo: "asc" },
        select: { id: true, lineNo: true, sku: true, itemName: true, unit: true, quantity: true },
    },
};

const checkSelect = {
    id: true,
    orderItemId: true,
    plannedQty: true,
    loadedQty: true,
    status: true,
    shortQty: true,
    note: true,
    issueId: true,
    checkedAt: true,
};

// the detail screen also has to describe a loaded line that has since left the plan
const checkDetailSelect = {
    ...checkSelect,
    orderItem: {
        select: {
            sku: true,
            itemName: true,
            order: { select: { reference: true, outlet: { select: { name: true } } } },
        },
    },
};

const sessionSelect = (detail) => ({
    id: true,
    status: true,
    lockedById: true,
    lockedBy: { select: userSelect },
    lockExpiresAt: true,
    startedAt: true,
    startedBy: { select: userSelect },
    pausedAt: true,
    pausedSec: true,
    completedAt: true,
    completedBy: { select: userSelect },
    departedShort: true,
    checks: { select: detail ? checkDetailSelect : checkSelect },
});

// The trip with its LIVE plan (stops -> allocated orders -> lines) and its loading session.
// `detail` adds what only the task screen needs: the latest shortfall report and orphaned-line labels.
export const tripSelect = (detail = false) => ({
    id: true,
    code: true,
    status: true,
    deliveryDate: true,
    tripNumber: true,
    plannedDeparture: true,
    vehicleId: true,
    vehicle: { select: vehicleSelect },
    plan: { select: { id: true, status: true, depotId: true, depot: { select: depotSelect } } },
    loadingSession: { select: sessionSelect(detail) },
    stops: {
        orderBy: { sequence: "asc" },
        select: {
            id: true,
            sequence: true,
            plannedArrival: true,
            outlet: { select: outletSelect },
            allocations: { select: { order: { select: orderSelect } } },
        },
    },
    ...(detail
        ? {
              issues: {
                  where: { type: "LOADING_SHORTFALL" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: {
                      id: true,
                      reference: true,
                      status: true,
                      description: true,
                      createdAt: true,
                      reportedBy: { select: userSelect },
                  },
              },
          }
        : {}),
});

// trips of the loader's depots on one delivery day that belong in the loading pool
const poolWhere = ({ depotIds, date }) => ({
    deliveryDate: date,
    status: { not: "CANCELLED" },
    plan: { depotId: { in: depotIds }, status: { in: VISIBLE_PLAN_STATUSES } },
    // a route with nothing allocated to it has nothing to load
    stops: { some: { allocations: { some: {} } } },
});

// Pending tab = not finished (no session yet counts as pending); Completed tab = loading finished
const tabWhere = (tab) =>
    tab === "completed"
        ? { loadingSession: { is: { status: "COMPLETED" } } }
        : {
              status: { in: PENDING_TRIP_STATUSES },
              OR: [
                  { loadingSession: { is: null } },
                  { loadingSession: { is: { status: { in: OPEN_SESSION_STATUSES } } } },
              ],
          };

const departureOrder = [{ plannedDeparture: { sort: "asc", nulls: "last" } }, { code: "asc" }];

// the trip, only if it sits in a plan at one of the loader's depots
const accessibleTripWhere = (tripId, depotIds) => ({
    id: tripId,
    plan: { depotId: { in: depotIds }, status: { in: VISIBLE_PLAN_STATUSES } },
});

// the loader's depot assignments, plus the depot of their outlet as a fallback
export const findLoaderScope = async (userId) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            isActive: true,
            isApproved: true,
            depots: { select: { depotId: true } },
            outlet: { select: { depotId: true } },
        },
    });
};

// one page of the task pool for a tab, with optional route/vehicle search and brand filter
export const findTasksPage = async ({ depotIds, date, tab, search, brand, skip, take }) => {
    const db = getPrisma();
    const where = {
        AND: [
            poolWhere({ depotIds, date }),
            tabWhere(tab),
            ...(search
                ? [
                      {
                          OR: [
                              { code: { contains: search, mode: "insensitive" } },
                              { vehicle: { code: { contains: search, mode: "insensitive" } } },
                          ],
                      },
                  ]
                : []),
            ...(brand ? [{ stops: { some: { allocations: { some: { order: { brand } } } } } }] : []),
        ],
    };
    const orderBy =
        tab === "completed"
            ? [{ loadingSession: { completedAt: "desc" } }, { code: "asc" }]
            : departureOrder;
    const [items, total] = await Promise.all([
        db.trip.findMany({ where, select: tripSelect(false), orderBy, skip, take }),
        db.trip.count({ where }),
    ]);
    return { items, total };
};

// every trip in the pool for one day (home summary totals)
export const findTripsForDay = async ({ depotIds, date }) => {
    const db = getPrisma();
    return db.trip.findMany({
        where: poolWhere({ depotIds, date }),
        select: tripSelect(false),
        orderBy: departureOrder,
    });
};

// one trip with its live plan, if it is visible to the loader's depots
export const findTripForLoading = async (tripId, depotIds) => {
    const db = getPrisma();
    return db.trip.findFirst({ where: accessibleTripWhere(tripId, depotIds), select: tripSelect(true) });
};

// same lookup inside a transaction; the light graph (default) skips the labels only the task screen shows
export const findTripForLoadingTx = (tx, tripId, depotIds, { detail = false } = {}) => {
    return tx.trip.findFirst({ where: accessibleTripWhere(tripId, depotIds), select: tripSelect(detail) });
};

// just the trip's access check and session state - enough to pause a task without loading its whole plan
export const findTripSessionTx = (tx, tripId, depotIds) => {
    return tx.trip.findFirst({
        where: accessibleTripWhere(tripId, depotIds),
        select: {
            id: true,
            loadingSession: {
                select: { id: true, status: true, lockedById: true, lockedBy: { select: userSelect }, lockExpiresAt: true },
            },
        },
    });
};

// lock the trip's vehicle row until the transaction ends, so claims on the same vehicle run one after the other
// (NO KEY UPDATE: serialises claims and vehicle updates without blocking foreign-key inserts that reference the vehicle)
export const lockTripVehicleTx = (tx, tripId) => {
    return tx.$queryRaw`SELECT v."id" FROM "Vehicle" v JOIN "Trip" t ON t."vehicleId" = v."id" WHERE t."id" = ${tripId} FOR NO KEY UPDATE OF v`;
};

// another route of the same vehicle and day that somebody is actively loading right now
export const findBusyVehicleSessionTx = (tx, { vehicleId, deliveryDate, excludeTripId, now }) => {
    return tx.loadingSession.findFirst({
        where: {
            status: "IN_PROGRESS",
            lockExpiresAt: { gt: now },
            trip: { vehicleId, deliveryDate, id: { not: excludeTripId } },
        },
        select: { lockedBy: { select: userSelect }, lockExpiresAt: true, trip: { select: { code: true } } },
    });
};

// current session state, read after a failed compare-and-set to explain why it failed
export const findSessionStateTx = (tx, tripId) => {
    return tx.loadingSession.findUnique({
        where: { tripId },
        select: {
            id: true,
            status: true,
            lockedById: true,
            lockedBy: { select: userSelect },
            lockExpiresAt: true,
        },
    });
};

// create the session for a trip; count 0 means another loader created it first (ON CONFLICT DO NOTHING)
export const createSessionIfAbsentTx = (tx, data) => {
    return tx.loadingSession.createMany({ data: [data], skipDuplicates: true });
};

// compare-and-set PAUSED -> IN_PROGRESS; matching on pausedAt makes sure the idle time added is the interval we read
export const resumePausedSessionTx = (tx, { sessionId, pausedAt, userId, lockExpiresAt, idleSec }) => {
    return tx.loadingSession.updateMany({
        where: { id: sessionId, status: "PAUSED", pausedAt },
        data: {
            status: "IN_PROGRESS",
            lockedById: userId,
            lockExpiresAt,
            pausedAt: null,
            pausedSec: { increment: idleSec },
        },
    });
};

// compare-and-set: take over an IN_PROGRESS session whose lock has expired
export const takeOverExpiredLockTx = (tx, { sessionId, userId, lockExpiresAt, now }) => {
    return tx.loadingSession.updateMany({
        where: {
            id: sessionId,
            status: "IN_PROGRESS",
            OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lte: now } }],
        },
        data: { lockedById: userId, lockExpiresAt },
    });
};

// compare-and-set: extend the lock, only if the caller still holds it (also locks the row until commit)
export const refreshLockTx = (tx, { sessionId, userId, lockExpiresAt }) => {
    return tx.loadingSession.updateMany({
        where: { id: sessionId, status: "IN_PROGRESS", lockedById: userId },
        data: { lockExpiresAt },
    });
};

// compare-and-set IN_PROGRESS -> PAUSED, releasing the lock back to the pool
export const pauseSessionTx = (tx, { sessionId, userId, now }) => {
    return tx.loadingSession.updateMany({
        where: { id: sessionId, status: "IN_PROGRESS", lockedById: userId },
        data: { status: "PAUSED", lockedById: null, lockExpiresAt: null, pausedAt: now },
    });
};

// compare-and-set IN_PROGRESS -> ON_HOLD (shortfall reported), releasing the lock
export const holdSessionTx = (tx, { sessionId, userId, now }) => {
    return tx.loadingSession.updateMany({
        where: { id: sessionId, status: "IN_PROGRESS", lockedById: userId },
        data: { status: "ON_HOLD", lockedById: null, lockExpiresAt: null, pausedAt: now },
    });
};

// compare-and-set IN_PROGRESS -> COMPLETED
export const completeSessionTx = (tx, { sessionId, userId, now, departedShort }) => {
    return tx.loadingSession.updateMany({
        where: { id: sessionId, status: "IN_PROGRESS", lockedById: userId },
        data: {
            status: "COMPLETED",
            completedAt: now,
            completedById: userId,
            lockedById: null,
            lockExpiresAt: null,
            pausedAt: null,
            departedShort,
        },
    });
};

// create check rows for plan lines that have none yet (existing rows are left alone)
export const createChecksTx = (tx, rows) => {
    return tx.loadingItemCheck.createMany({ data: rows, skipDuplicates: true });
};

// keep the planned-quantity snapshot on a check in step with the live plan
export const updateCheckPlannedQtyTx = (tx, checkId, plannedQty) => {
    return tx.loadingItemCheck.update({ where: { id: checkId }, data: { plannedQty } });
};

// create or update the saved quantity / flag of one order line
export const upsertCheckTx = (tx, { sessionId, orderItemId, create, update }) => {
    return tx.loadingItemCheck.upsert({
        where: { sessionId_orderItemId: { sessionId, orderItemId } },
        create: { sessionId, orderItemId, ...create },
        update,
    });
};

// all saved lines of a session
export const findChecksBySessionTx = (tx, sessionId) => {
    return tx.loadingItemCheck.findMany({ where: { sessionId }, select: checkSelect });
};

// move a trip between statuses only if it is currently in one of `from`; returns the updated count
export const moveTripStatusTx = (tx, { tripId, from, to }) => {
    return tx.trip.updateMany({
        where: { id: tripId, status: { in: from } },
        data: { status: to, version: { increment: 1 } },
    });
};

// a vehicle being loaded is committed to a run (no-op unless it is currently AVAILABLE)
export const markVehicleAssignedTx = (tx, vehicleId) => {
    return tx.vehicle.updateMany({ where: { id: vehicleId, status: "AVAILABLE" }, data: { status: "ASSIGNED" } });
};

// next number of the ISS-### reference sequence
export const nextIssueNumberTx = async (tx) => {
    const rows = await tx.$queryRaw`SELECT nextval('issue_ref_seq') AS n`;
    return Number(rows[0].n);
};

// record a shortfall report
export const createIssueTx = (tx, data) => {
    return tx.issue.create({
        data,
        select: { id: true, reference: true, status: true, description: true, createdAt: true },
    });
};

// find a shortfall report by the id the client generated (retry detection)
export const findIssueByClientMutationId = async (clientMutationId) => {
    const db = getPrisma();
    return db.issue.findUnique({
        where: { clientMutationId },
        select: { id: true, tripId: true, reportedById: true },
    });
};

// append a row to the audit trail
export const createAuditLogTx = (tx, data) => {
    return tx.auditLog.create({ data });
};

// Shortfall reports the loaders raised on trips of the given depots. "Pending" is everything the dispatcher has not
// resolved yet, whatever day the trip is on, so an old unresolved report stays visible.
const PENDING_STATUSES = ["OPEN", "INVESTIGATING"];
const loaderIssueWhere = (depotIds) => ({
    source: "LOADER",
    type: "LOADING_SHORTFALL",
    trip: { plan: { depotId: { in: depotIds } } },
});

export const countOpenLoaderIssues = async ({ depotIds }) => {
    const db = getPrisma();
    return db.issue.count({ where: { ...loaderIssueWhere(depotIds), status: { in: PENDING_STATUSES } } });
};

export const countLoaderIssuesByTab = async ({ depotIds }) => {
    const db = getPrisma();
    const [pending, resolved] = await Promise.all([
        db.issue.count({ where: { ...loaderIssueWhere(depotIds), status: { in: PENDING_STATUSES } } }),
        db.issue.count({ where: { ...loaderIssueWhere(depotIds), status: "RESOLVED" } }),
    ]);
    return { pending, resolved };
};

// the reports of one tab, newest first, with the lines each one flagged
export const findLoaderIssues = async ({ depotIds, tab, take }) => {
    const db = getPrisma();
    return db.issue.findMany({
        where: { ...loaderIssueWhere(depotIds), status: tab === "resolved" ? "RESOLVED" : { in: PENDING_STATUSES } },
        orderBy: { createdAt: "desc" },
        take,
        select: {
            id: true,
            reference: true,
            status: true,
            description: true,
            createdAt: true,
            resolvedAt: true,
            resolutionNote: true,
            reportedBy: { select: { id: true, fullName: true } },
            resolvedBy: { select: { id: true, fullName: true } },
            trip: { select: { id: true, code: true } },
            loadingChecks: {
                orderBy: [{ orderItem: { order: { reference: "asc" } } }, { orderItem: { lineNo: "asc" } }],
                select: {
                    status: true,
                    plannedQty: true,
                    loadedQty: true,
                    shortQty: true,
                    note: true,
                    orderItem: { select: { id: true, itemName: true, sku: true, lineNo: true, order: { select: { reference: true } } } },
                },
            },
        },
    });
};

// Manages database persistence for LoadingSession and LoadingItemCheck models via Prisma.

// Creates the (empty) loading session of a trip with one PENDING check per order line. Called when a plan is published;
// LoadingSession.tripId is unique, so an existing session is kept untouched.
export const createSessionWithChecksTx = async (tx, { tripId, checks }) => {
	const existing = await tx.loadingSession.findUnique({ where: { tripId }, select: { id: true } });
	if (existing) return existing;
	return tx.loadingSession.create({
		data: {
			tripId,
			checks: { create: checks.map(({ orderItemId, plannedQty }) => ({ orderItemId, plannedQty })) },
		},
		select: { id: true, tripId: true },
	});
};
