import { AppError } from "../../utils/appError.js";
import { config } from "../../config/env.js";
import { getPrisma } from "../../config/database.js";
import { transitionOrdersTx } from "../orders/orders.service.js";
import { dateParts } from "../orders/orders.adapters.js";
import {
    findLoaderScope,
    findTasksPage,
    findTripsForDay,
    findTripForLoading,
    findTripForLoadingTx,
    findTripSessionTx,
    lockTripVehicleTx,
    findBusyVehicleSessionTx,
    findSessionStateTx,
    createSessionIfAbsentTx,
    claimUnstartedSessionTx,
    resumePausedSessionTx,
    takeOverExpiredLockTx,
    refreshLockTx,
    pauseSessionTx,
    holdSessionTx,
    completeSessionTx,
    createChecksTx,
    updateCheckPlannedQtyTx,
    upsertCheckTx,
    findChecksBySessionTx,
    moveTripStatusTx,
    markVehicleAssignedTx,
    nextIssueNumberTx,
    createIssueTx,
    findIssueByClientMutationId,
    createAuditLogTx,
    countOpenLoaderIssues,
    countLoaderIssuesByTab,
    findLoaderIssues,
} from "./loading.repository.js";
import {
    POOL_PLAN_STATUSES,
    PENDING_TRIP_STATUSES,
    buildTaskModel,
    deriveLineStatus,
    isLockExpired,
    isUnstartedSession,
    summarizeDay,
} from "./loading.rules.js";
import {
    toHomeSummaryDTO,
    toLoaderIssueListDTO,
    toTaskListResponseDTO,
    toTaskDetailDTO,
    toTaskSummaryDTO,
    toLineUpdateDTO,
} from "./loading.dto.js";

const LOCK_TTL_MS = config.loadingLockTtlMs;
const LOCK_TTL_SEC = Math.round(LOCK_TTL_MS / 1000);

// Start / complete / shortfall touch many rows in one go; Prisma's 5 s default is too tight over a remote pooler.
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

// How a shortfall type is recorded on the line, and how it reads in the issue text.
const SHORTFALL_STATUS_BY_TYPE = { MISSING: "SHORT", DAMAGED: "DAMAGED", WRONG_ITEM: "WRONG_ITEM" };
const SHORTFALL_LABEL_BY_TYPE = { MISSING: "missing", DAMAGED: "damaged", WRONG_ITEM: "wrong item" };

const pad2 = (value) => String(value).padStart(2, "0");

// "Today" for a loader is the Asia/Colombo calendar date, whatever the server's timezone is.
const todayInColombo = () => {
    const { year, month, day } = dateParts(new Date());
    return `${year}-${pad2(month)}-${pad2(day)}`;
};

// date-only columns are stored as UTC midnight
const dayStart = (isoDate) => new Date(`${isoDate}T00:00:00.000Z`);

// Which trips a request is about. An explicit date means exactly that day. Without one it is today AND every later day:
// dispatchers plan (and publish) the next delivery day, so the load for tomorrow must already be there tonight.
const poolScope = (date) => {
    const today = todayInColombo();
    return date ? { day: date, filter: { date: dayStart(date) } } : { day: today, filter: { from: dayStart(today) } };
};

const newLockExpiry = (now) => new Date(now.getTime() + LOCK_TTL_MS);

const buildModel = (trip, userId, now = new Date()) =>
    buildTaskModel({ trip, viewerId: userId, now, lockTtlSec: LOCK_TTL_SEC });

const taskNotFound = () => new AppError("Loading task not found.", 404, { code: "TASK_NOT_FOUND" });

// The state changed between our read and our compare-and-set and we could not tell how; the caller can simply retry.
const staleStateError = () =>
    new AppError("The task changed while you were working on it. Please try again.", 409, { code: "TASK_CHANGED" });

// Why this loader cannot act on the task right now - or null when they hold it and may.
const explainUnavailable = (session, userId) => {
    if (!session || isUnstartedSession(session)) {
        return new AppError("Loading has not been started for this route.", 409, { code: "TASK_NOT_STARTED" });
    }
    switch (session.status) {
        case "COMPLETED":
            return new AppError("Loading for this route is already completed.", 409, { code: "TASK_COMPLETED" });
        case "ON_HOLD":
            return new AppError(
                "A shortfall was reported for this route. It is on hold until the dispatcher reviews it.",
                409,
                { code: "TASK_ON_HOLD" },
            );
        case "PAUSED":
            return new AppError("This route is paused. Open it again to continue loading.", 409, {
                code: "TASK_PAUSED",
            });
        default:
            if (session.lockedById === userId) return null;
            return new AppError(
                `This route is being loaded by ${session.lockedBy?.fullName ?? "another loader"}.`,
                409,
                {
                    code: "TASK_LOCKED",
                    lockedBy: session.lockedBy ?? null,
                    lockExpiresAt: session.lockExpiresAt,
                },
            );
    }
};

// Only the loader who holds the lock may change a task.
const assertHolder = (session, userId) => {
    const error = explainUnavailable(session, userId);
    if (error) throw error;
};

// A compare-and-set affected nothing: say why from the session's current state.
const failedClaimError = async (tx, tripId, userId) =>
    explainUnavailable(await findSessionStateTx(tx, tripId), userId) ?? staleStateError();

// Loading only makes sense for a published plan whose trip has not left yet.
const assertTripLoadable = (trip) => {
    if (!POOL_PLAN_STATUSES.includes(trip.plan.status) || !PENDING_TRIP_STATUSES.includes(trip.status)) {
        throw new AppError(
            `This route can no longer be loaded (trip ${trip.status}, plan ${trip.plan.status}).`,
            409,
            { code: "TRIP_NOT_LOADABLE", tripStatus: trip.status, planStatus: trip.plan.status },
        );
    }
};

const violationError = (violations) =>
    new AppError(
        "This load breaks an operating constraint, so it cannot be loaded. Ask the dispatcher to fix the plan.",
        409,
        { code: "PLAN_CONSTRAINT_VIOLATION", violations },
    );

// The client echoes the revision it last saw; if the dispatcher changed the plan since, make it refresh first.
const assertPlanRevision = (model, planRevision) => {
    if (planRevision && planRevision !== model.planRevision) {
        throw new AppError("The plan for this route changed. Refresh to see the latest.", 409, {
            code: "PLAN_CHANGED",
            planRevision: model.planRevision,
        });
    }
};

// A vehicle is loaded for one route at a time: block when another route of the same vehicle and day is being worked.
const assertVehicleFreeTx = async (tx, trip, now) => {
    const busy = await findBusyVehicleSessionTx(tx, {
        vehicleId: trip.vehicleId,
        deliveryDate: trip.deliveryDate,
        excludeTripId: trip.id,
        now,
    });
    if (busy) {
        throw new AppError(
            `Vehicle ${trip.vehicle.code} is already being loaded for route ${busy.trip.code}. Pause or complete that route first.`,
            409,
            {
                code: "VEHICLE_BUSY",
                routeCode: busy.trip.code,
                lockedBy: busy.lockedBy ?? null,
                lockExpiresAt: busy.lockExpiresAt,
            },
        );
    }
};

// Which depots this loader works. Explicit UserDepot assignments win; a loader approved through the employees
// flow only has an outlet, so fall back to that outlet's depot (same idea as getScope in orders.adapters.js).
const resolveDepotIds = async (userId) => {
    const user = await findLoaderScope(userId);
    if (!user || !user.isActive || !user.isApproved) {
        throw new AppError("Your account is not active.", 403, { code: "ACCOUNT_INACTIVE" });
    }
    const depotIds = user.depots.length > 0 ? user.depots.map((depot) => depot.depotId) : user.outlet ? [user.outlet.depotId] : [];
    if (depotIds.length === 0) {
        throw new AppError("The signed-in loader is not assigned to a depot.", 403, { code: "NO_DEPOT" });
    }
    return depotIds;
};

// Make sure every line of the live plan has a saved row, and keep the planned-quantity snapshot current.
const syncChecksTx = async (tx, { sessionId, lines, checks }) => {
    const savedByItemId = new Map(checks.map((check) => [check.orderItemId, check]));

    const missing = lines
        .filter((line) => !savedByItemId.has(line.orderItemId))
        .map((line) => ({
            sessionId,
            orderItemId: line.orderItemId,
            plannedQty: line.plannedQty,
            loadedQty: 0,
            status: "PENDING",
        }));
    if (missing.length > 0) await createChecksTx(tx, missing);

    for (const line of lines) {
        const saved = savedByItemId.get(line.orderItemId);
        if (saved && saved.plannedQty !== line.plannedQty) {
            await updateCheckPlannedQtyTx(tx, saved.id, line.plannedQty);
        }
    }
};

const recordAuditTx = (tx, { userId, action, sessionId, before, after, ip, requestId }) =>
    createAuditLogTx(tx, {
        actorId: userId,
        action,
        entityType: "LoadingSession",
        entityId: sessionId,
        before,
        after,
        ip: ip ?? null,
        requestId: requestId ?? null,
    });

export const getHomeSummaryService = async ({ userId, date }) => {
    const depotIds = await resolveDepotIds(userId);
    const { day, filter } = poolScope(date);

    const [trips, openIssues] = await Promise.all([
        findTripsForDay({ depotIds, ...filter }),
        countOpenLoaderIssues({ depotIds }),
    ]);

    const now = new Date();
    const models = trips.map((trip) => buildModel(trip, userId, now));
    return toHomeSummaryDTO({ date: day, summary: summarizeDay(models), openIssues });
};

// The Issues screen: shortfall reports of the loader's depots, pending until the dispatcher resolves them.
export const listIssuesService = async ({ userId, tab, limit }) => {
    const depotIds = await resolveDepotIds(userId);
    const [issues, counts] = await Promise.all([findLoaderIssues({ depotIds, tab, take: limit }), countLoaderIssuesByTab({ depotIds })]);
    return toLoaderIssueListDTO({ issues, counts, tab, limit });
};

export const listTasksService = async ({ userId, tab, search, brand, date, page, limit }) => {
    const depotIds = await resolveDepotIds(userId);
    const { day, filter } = poolScope(date);

    const { items, total } = await findTasksPage({
        depotIds,
        ...filter,
        tab,
        search,
        brand,
        skip: (page - 1) * limit,
        take: limit,
    });

    const now = new Date();
    const models = items.map((trip) => buildModel(trip, userId, now));
    return toTaskListResponseDTO({ models, total, page, limit, date: day, tab, upcoming: !date });
};

const readTaskDetail = async ({ userId, tripId, depotIds }) => {
    const trip = await findTripForLoading(tripId, depotIds);
    if (!trip) throw taskNotFound();
    return toTaskDetailDTO(buildModel(trip, userId));
};

const readTaskSummary = async ({ userId, tripId, depotIds }) => {
    const trip = await findTripForLoading(tripId, depotIds);
    if (!trip) throw taskNotFound();
    return toTaskSummaryDTO(buildModel(trip, userId));
};

// Always read from the live plan: a task is never served from a cached copy.
export const getTaskService = async ({ userId, tripId }) =>
    readTaskDetail({ userId, tripId, depotIds: await resolveDepotIds(userId) });

// Review & Complete before the task is done; the Loading Completed screen after.
export const getTaskSummaryService = async ({ userId, tripId }) =>
    readTaskSummary({ userId, tripId, depotIds: await resolveDepotIds(userId) });

// "Open Task": claim a pending task, resume a paused one, take over an abandoned one,
// or - when the caller already holds it - just extend the lock (the client's heartbeat).
export const startTaskService = async ({ userId, tripId, ip, requestId }) => {
    const depotIds = await resolveDepotIds(userId);
    const db = getPrisma();

    await db.$transaction(async (tx) => {
        // Claims on the same vehicle run one after the other: whoever gets this row lock first is seen by the other.
        await lockTripVehicleTx(tx, tripId);

        const trip = await findTripForLoadingTx(tx, tripId, depotIds);
        if (!trip) throw taskNotFound();
        // A finished load is final: say so before talking about the trip's status (it is LOADED by now).
        if (trip.loadingSession?.status === "COMPLETED") throw explainUnavailable(trip.loadingSession, userId);
        assertTripLoadable(trip);

        const now = new Date();
        const model = buildModel(trip, userId, now);
        if (model.violations.length > 0) throw violationError(model.violations);

        const lockExpiresAt = newLockExpiry(now);
        const session = trip.loadingSession;
        let sessionId;
        let action = "LOADING_STARTED";

        if (!session) {
            await assertVehicleFreeTx(tx, trip, now);
            const created = await createSessionIfAbsentTx(tx, {
                tripId,
                status: "IN_PROGRESS",
                lockedById: userId,
                lockExpiresAt,
                startedById: userId,
                startedAt: now,
            });
            // count 0: another loader created the session between our read and our insert
            if (created.count === 0) throw await failedClaimError(tx, tripId, userId);
            sessionId = (await findSessionStateTx(tx, tripId)).id;
        } else if (isUnstartedSession(session)) {
            // registered when the plan was published; this is its first claim
            await assertVehicleFreeTx(tx, trip, now);
            const claimed = await claimUnstartedSessionTx(tx, { sessionId: session.id, userId, lockExpiresAt, now });
            if (claimed.count === 0) throw await failedClaimError(tx, tripId, userId);
            sessionId = session.id;
        } else {
            sessionId = session.id;
            switch (session.status) {
                case "COMPLETED":
                case "ON_HOLD":
                    throw explainUnavailable(session, userId);

                case "PAUSED": {
                    await assertVehicleFreeTx(tx, trip, now);
                    const idleSec = session.pausedAt
                        ? Math.max(Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000), 0)
                        : 0;
                    const resumed = await resumePausedSessionTx(tx, {
                        sessionId,
                        pausedAt: session.pausedAt,
                        userId,
                        lockExpiresAt,
                        idleSec,
                    });
                    if (resumed.count === 0) throw await failedClaimError(tx, tripId, userId);
                    action = "LOADING_RESUMED";
                    break;
                }

                default: {
                    if (session.lockedById === userId) {
                        // Already ours: this is the heartbeat / re-open after an app restart. Extend the lock and stop.
                        const refreshed = await refreshLockTx(tx, { sessionId, userId, lockExpiresAt });
                        if (refreshed.count === 0) throw await failedClaimError(tx, tripId, userId);
                        return;
                    }
                    if (!isLockExpired(session, now)) throw explainUnavailable(session, userId);

                    // The holder went quiet past the lock timeout (dead tablet, forgotten task): take it over.
                    await assertVehicleFreeTx(tx, trip, now);
                    const takenOver = await takeOverExpiredLockTx(tx, { sessionId, userId, lockExpiresAt, now });
                    if (takenOver.count === 0) throw await failedClaimError(tx, tripId, userId);
                    action = "LOADING_LOCK_TAKEN_OVER";
                }
            }
        }

        // A plan that grew since the last visit gets saved rows for its new lines too.
        await syncChecksTx(tx, { sessionId, lines: model.lines, checks: session?.checks ?? [] });

        await moveTripStatusTx(tx, { tripId, from: ["PLANNED"], to: "LOADING" });
        await markVehicleAssignedTx(tx, trip.vehicleId);

        await recordAuditTx(tx, {
            userId,
            action,
            sessionId,
            before: { status: session?.status ?? "PENDING", lockedById: session?.lockedById ?? null },
            after: { status: "IN_PROGRESS", lockedById: userId },
            ip,
            requestId,
        });
    }, TX_OPTIONS);

    return readTaskDetail({ userId, tripId, depotIds });
};

// "Pause Loading": hand the task back to the shared pool with every saved quantity kept.
export const pauseTaskService = async ({ userId, tripId, ip, requestId }) => {
    const depotIds = await resolveDepotIds(userId);
    const db = getPrisma();

    await db.$transaction(async (tx) => {
        // Pausing needs the session only, not the whole plan.
        const trip = await findTripSessionTx(tx, tripId, depotIds);
        if (!trip) throw taskNotFound();
        const session = trip.loadingSession;

        // Already back in the pool (double tap, retry after a timeout): the goal is met, nothing to do.
        if (session?.status === "PAUSED") return;
        assertHolder(session, userId);

        const paused = await pauseSessionTx(tx, { sessionId: session.id, userId, now: new Date() });
        if (paused.count === 0) throw await failedClaimError(tx, tripId, userId);

        await recordAuditTx(tx, {
            userId,
            action: "LOADING_PAUSED",
            sessionId: session.id,
            before: { status: "IN_PROGRESS", lockedById: userId },
            after: { status: "PAUSED", lockedById: null },
            ip,
            requestId,
        });
    }, TX_OPTIONS);

    return readTaskDetail({ userId, tripId, depotIds });
};

// The stepper: save loaded quantities (absolute numbers) for one or more order lines.
export const updateTaskLinesService = async ({ userId, tripId, lines, planRevision }) => {
    const depotIds = await resolveDepotIds(userId);
    const db = getPrisma();

    const result = await db.$transaction(async (tx) => {
        const trip = await findTripForLoadingTx(tx, tripId, depotIds);
        if (!trip) throw taskNotFound();
        const session = trip.loadingSession;
        assertHolder(session, userId);
        // the dispatcher may have cancelled or released the route since the loader last looked
        assertTripLoadable(trip);

        const now = new Date();
        const lockExpiresAt = newLockExpiry(now);

        // Row lock first: until this transaction commits nobody can take the task over, pause it or complete it under us.
        const held = await refreshLockTx(tx, { sessionId: session.id, userId, lockExpiresAt });
        if (held.count === 0) throw await failedClaimError(tx, tripId, userId);

        // The plan may have changed since the loader's screen was drawn, so every line is judged against the live plan.
        const model = buildModel(trip, userId, now);
        assertPlanRevision(model, planRevision);

        const liveLines = new Map(model.lines.map((line) => [line.orderItemId, line]));
        const removedLines = new Map(model.removedLines.map((line) => [line.orderItemId, line]));
        const savedChecks = new Map(session.checks.map((check) => [check.orderItemId, check]));

        const planned = lines.map(({ orderItemId, loadedQty }) => {
            const live = liveLines.get(orderItemId);
            if (live) {
                if (loadedQty > live.maxLoadableQty) {
                    throw new AppError(
                        live.shortQty > 0
                            ? `Only ${live.maxLoadableQty} of ${live.plannedQty} can be loaded for ${live.itemName}: ${live.shortQty} were reported short.`
                            : `Cannot load more than the planned ${live.plannedQty} for ${live.itemName}.`,
                        422,
                        {
                            code: "QTY_EXCEEDS_PLANNED",
                            orderItemId,
                            requested: loadedQty,
                            plannedQty: live.plannedQty,
                            shortQty: live.shortQty,
                            maxLoadableQty: live.maxLoadableQty,
                        },
                    );
                }
                return { orderItemId, loadedQty, plannedQty: live.plannedQty };
            }

            // A line that left the plan can only be unloaded, never loaded further.
            const removed = removedLines.get(orderItemId);
            if (!removed || loadedQty > removed.loadedQty) {
                throw new AppError("This line is not part of the current plan for this route.", 422, {
                    code: "LINE_NOT_IN_PLAN",
                    orderItemId,
                });
            }
            return { orderItemId, loadedQty, plannedQty: savedChecks.get(orderItemId).plannedQty };
        });

        // We hold the row lock, so nobody else can change these rows: apply the writes to our copy
        // instead of reading everything back.
        const nextChecks = new Map(savedChecks);
        for (const write of planned) {
            const data = {
                plannedQty: write.plannedQty,
                loadedQty: write.loadedQty,
                status: deriveLineStatus({
                    storedStatus: savedChecks.get(write.orderItemId)?.status,
                    loadedQty: write.loadedQty,
                    plannedQty: write.plannedQty,
                }),
                checkedById: userId,
                checkedAt: now,
            };
            await upsertCheckTx(tx, {
                sessionId: session.id,
                orderItemId: write.orderItemId,
                create: data,
                update: data,
            });
            nextChecks.set(write.orderItemId, {
                shortQty: 0,
                note: null,
                issueId: null,
                ...savedChecks.get(write.orderItemId),
                orderItemId: write.orderItemId,
                ...data,
            });
        }

        const fresh = buildModel(
            { ...trip, loadingSession: { ...session, lockExpiresAt, checks: [...nextChecks.values()] } },
            userId,
            now,
        );
        return { model: fresh, updatedItemIds: planned.map((write) => write.orderItemId) };
    }, TX_OPTIONS);

    return toLineUpdateDTO(result);
};

// "Report Shortfall": record what is missing / damaged / wrong and put the load on hold for the dispatcher.
export const reportShortfallService = async ({ userId, tripId, lines, reason, clientMutationId, ip, requestId }) => {
    const depotIds = await resolveDepotIds(userId);

    // A retried request (same client id) is answered with the current state instead of filing a second report.
    if (clientMutationId) {
        const earlier = await findIssueByClientMutationId(clientMutationId);
        if (earlier) {
            if (earlier.tripId !== tripId || earlier.reportedById !== userId) {
                throw new AppError("This request id was already used for a different report.", 409, {
                    code: "DUPLICATE_REQUEST",
                });
            }
            return readTaskDetail({ userId, tripId, depotIds });
        }
    }

    const db = getPrisma();

    await db.$transaction(async (tx) => {
        const trip = await findTripForLoadingTx(tx, tripId, depotIds);
        if (!trip) throw taskNotFound();
        const session = trip.loadingSession;
        assertHolder(session, userId);
        assertTripLoadable(trip);

        // Flip to ON_HOLD first (this also takes the row lock); any validation failure below rolls it back.
        const now = new Date();
        const held = await holdSessionTx(tx, { sessionId: session.id, userId, now });
        if (held.count === 0) throw await failedClaimError(tx, tripId, userId);

        const model = buildModel(trip, userId, now);
        const liveLines = new Map(model.lines.map((line) => [line.orderItemId, line]));

        const flagged = lines.map((reported) => {
            const live = liveLines.get(reported.orderItemId);
            if (!live) {
                throw new AppError("This line is not part of the current plan for this route.", 422, {
                    code: "LINE_NOT_IN_PLAN",
                    orderItemId: reported.orderItemId,
                });
            }
            if (reported.shortQty > live.plannedQty) {
                throw new AppError(`${live.itemName}: only ${live.plannedQty} were planned.`, 422, {
                    code: "SHORT_QTY_EXCEEDS_PLANNED",
                    orderItemId: reported.orderItemId,
                    plannedQty: live.plannedQty,
                });
            }
            // You cannot have loaded units that you also say are not there.
            const availableQty = live.plannedQty - reported.shortQty;
            if (live.loadedQty > availableQty) {
                throw new AppError(
                    `${live.itemName}: ${live.loadedQty} are already loaded but only ${availableQty} are available. Lower the loaded quantity first.`,
                    422,
                    {
                        code: "LOADED_EXCEEDS_AVAILABLE",
                        orderItemId: reported.orderItemId,
                        loadedQty: live.loadedQty,
                        availableQty,
                    },
                );
            }
            return { reported, live, availableQty };
        });

        const summary = `${flagged.length} line(s) short: ${flagged
            .map(({ reported, live }) => `${live.itemName} x${reported.shortQty} ${SHORTFALL_LABEL_BY_TYPE[reported.type]}`)
            .join("; ")}`;
        const orderIds = [...new Set(flagged.map(({ live }) => live.orderId))];

        const issue = await createIssueTx(tx, {
            reference: `ISS-${String(await nextIssueNumberTx(tx)).padStart(3, "0")}`,
            source: "LOADER",
            type: "LOADING_SHORTFALL",
            tripId,
            // the Issue row links one order; a report across several orders hangs off the trip only
            orderId: orderIds.length === 1 ? orderIds[0] : null,
            expectedQty: flagged.reduce((sum, { live }) => sum + live.plannedQty, 0),
            actualQty: flagged.reduce((sum, { availableQty }) => sum + availableQty, 0),
            description: (reason ? `${reason}. ${summary}` : summary).slice(0, 1000),
            reportedById: userId,
            clientMutationId: clientMutationId ?? null,
        });

        for (const { reported, live } of flagged) {
            const data = {
                plannedQty: live.plannedQty,
                loadedQty: live.loadedQty,
                status: SHORTFALL_STATUS_BY_TYPE[reported.type],
                shortQty: reported.shortQty,
                note: reported.note ?? null,
                issueId: issue.id,
                checkedById: userId,
                checkedAt: now,
            };
            await upsertCheckTx(tx, {
                sessionId: session.id,
                orderItemId: reported.orderItemId,
                create: data,
                update: data,
            });
        }

        await recordAuditTx(tx, {
            userId,
            action: "LOADING_SHORTFALL_REPORTED",
            sessionId: session.id,
            before: { status: "IN_PROGRESS", lockedById: userId },
            after: {
                status: "ON_HOLD",
                issue: issue.reference,
                lines: flagged.map(({ reported }) => ({
                    orderItemId: reported.orderItemId,
                    type: reported.type,
                    shortQty: reported.shortQty,
                })),
            },
            ip,
            requestId,
        });
    }, TX_OPTIONS);

    return readTaskDetail({ userId, tripId, depotIds });
};

// "Review & Complete": finish loading, mark the vehicle ready for its driver and move the orders on.
export const completeTaskService = async ({ userId, tripId, planRevision, ip, requestId }) => {
    const depotIds = await resolveDepotIds(userId);
    const db = getPrisma();

    await db.$transaction(async (tx) => {
        const trip = await findTripForLoadingTx(tx, tripId, depotIds);
        if (!trip) throw taskNotFound();
        const session = trip.loadingSession;

        // Same loader tapping twice (or retrying after a timeout) must not turn a success into an error.
        if (session?.status === "COMPLETED" && session.completedBy?.id === userId) return;
        assertHolder(session, userId);
        assertTripLoadable(trip);

        const now = new Date();

        // Row lock first, so the checks below run against data nobody else can change before we commit.
        const held = await refreshLockTx(tx, { sessionId: session.id, userId, lockExpiresAt: newLockExpiry(now) });
        if (held.count === 0) throw await failedClaimError(tx, tripId, userId);

        const checks = await findChecksBySessionTx(tx, session.id);
        const model = buildModel({ ...trip, loadingSession: { ...session, checks } }, userId, now);
        assertPlanRevision(model, planRevision);

        if (model.completionBlockers.length > 0) {
            throw new AppError("This route cannot be completed yet.", 422, {
                code: "COMPLETION_BLOCKED",
                blockers: model.completionBlockers,
                remainingItems: model.progress.remainingItems,
            });
        }

        const completed = await completeSessionTx(tx, {
            sessionId: session.id,
            userId,
            now,
            // lines left short were all covered by a recorded shortfall, so the vehicle leaves knowingly short
            departedShort: model.progress.remainingItems > 0,
        });
        if (completed.count === 0) throw await failedClaimError(tx, tripId, userId);

        // "Ready for the driver" is the trip being LOADED. It may still say PLANNED if a dispatcher reset it mid-load.
        const moved = await moveTripStatusTx(tx, { tripId, from: ["PLANNED", "LOADING"], to: "LOADED" });
        if (moved.count === 0) {
            throw new AppError("The trip can no longer be marked as loaded.", 409, {
                code: "TRIP_NOT_LOADABLE",
                tripStatus: trip.status,
            });
        }

        // Each planned order becomes LOADED, or PARTIALLY_LOADED when any of its lines left short.
        const fullyLoaded = [];
        const partlyLoaded = [];
        for (const order of model.orders) {
            if (order.status !== "PLANNED") continue;
            const orderLines = model.lines.filter((line) => line.orderId === order.id);
            (orderLines.every((line) => line.remainingQty === 0) ? fullyLoaded : partlyLoaded).push(order.id);
        }
        const context = { tripId, sessionId: session.id };
        if (fullyLoaded.length > 0) {
            await transitionOrdersTx(tx, {
                orderIds: fullyLoaded,
                toStatus: "LOADED",
                actorId: userId,
                reason: "LOADING_COMPLETED",
                data: context,
            });
        }
        if (partlyLoaded.length > 0) {
            await transitionOrdersTx(tx, {
                orderIds: partlyLoaded,
                toStatus: "PARTIALLY_LOADED",
                actorId: userId,
                reason: "LOADING_COMPLETED_SHORT",
                data: context,
            });
        }

        await recordAuditTx(tx, {
            userId,
            action: "LOADING_COMPLETED",
            sessionId: session.id,
            before: { status: "IN_PROGRESS", lockedById: userId },
            after: {
                status: "COMPLETED",
                departedShort: model.progress.remainingItems > 0,
                loadedItems: model.progress.loadedItems,
                remainingItems: model.progress.remainingItems,
            },
            ip,
            requestId,
        });
    }, TX_OPTIONS);

    return readTaskSummary({ userId, tripId, depotIds });
};
