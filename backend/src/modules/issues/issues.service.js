import { AppError } from "../../utils/appError.js";
import { IssueType, Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess, assertOutletAccess, assertTripDriver } from "../../utils/scope.js";
import { addDays, toUtcInstant } from "../../utils/businessTime.js";
import * as usersService from "../users/users.service.js";
import * as auditService from "../audit/audit.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as tripsService from "../trips/trips.service.js";
import * as filesService from "../files/files.service.js";
import {
    createIssuePhotosTx,
    createIssueTx,
    findIssueByClientMutationId,
    findIssueDetailById,
    listIssues,
    nextIssueNumberTx,
    updateIssueStatusTx,
} from "./issues.repository.js";
import { toIssueCreatedDTO, toIssueDTO, toIssueLinksDTO, toIssueListDTO, toIssueSnapshot } from "./issues.dto.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

// raised by the system itself, never by a person
const SYSTEM_TYPES = [IssueType.LOADING_SHORTFALL, IssueType.SYNC_CONFLICT];

// what each role may report (a report's source is its reporter's role)
const ALLOWED_TYPES = {
    [Role.LOADER]: ["MISSING_ITEM", "DAMAGED_ITEM", "WRONG_ITEM", "QUANTITY_SHORT", "VEHICLE_PROBLEM", "OTHER"],
    [Role.DRIVER]: ["OUTLET_CLOSED", "VEHICLE_PROBLEM", "TRAFFIC_DELAY", "OTHER"],
    [Role.STORE_MANAGER]: ["MISSING_ITEM", "DAMAGED_ITEM", "WRONG_ITEM", "QUANTITY_MISMATCH", "LATE_DELIVERY", "OTHER"],
    [Role.DISPATCHER]: Object.values(IssueType).filter((type) => !SYSTEM_TYPES.includes(type)),
};

const STATUS_TRANSITIONS = {
    OPEN: ["INVESTIGATING", "RESOLVED"],
    INVESTIGATING: ["RESOLVED"],
};

const DRIVER_DESCRIPTION_MAX = 200;

const fieldError = (field, message, code = "invalid") => new AppError("Validation failed.", 422, [{ field, message, code }]);

const issueReference = (value) => `ISS-${String(value).padStart(3, "0")}`;

// ---- what an issue is about ----

// The order, trip and stop an issue points at, as plain refs, and the depot they belong to.
// Missing records are 404. Pass a transaction to read inside it.
const loadTargets = async ({ orderId, tripId, stopId }, tx) => {
    // one after the other: inside a transaction there is a single connection, which runs one query at a time
    const order = orderId ? await ordersService.getOrderRef(orderId, tx) : null;
    const trip = tripId ? await tripsService.getTripRef(tripId, tx) : null;
    const stop = stopId ? await tripsService.getStopRef(stopId, tx) : null;
    return { order, trip, stop, depotId: order?.depotId ?? trip?.depotId ?? stop?.trip.depotId ?? null };
};

// The reporter must be allowed to act on everything the issue points at.
const assertTargetScope = (scope, { order, trip, stop }) => {
    if (order) {
        if (scope.role === Role.STORE_MANAGER) assertOutletAccess(scope, order.outletId);
        else if (scope.role === Role.DRIVER) assertTripDriver(scope, { driverId: order.driverId });
        else assertDepotAccess(scope, order.depotId);
    }
    if (trip) {
        if (scope.role === Role.DRIVER) assertTripDriver(scope, trip);
        else assertDepotAccess(scope, trip.depotId);
    }
    if (stop) {
        if (scope.role === Role.DRIVER) assertTripDriver(scope, stop.trip);
        else assertDepotAccess(scope, stop.trip.depotId);
    }
};

// The order, trip, stop and order line of one report must fit together.
const assertTargetsConsistent = ({ order, trip, stop }, orderItemId) => {
    if (order && trip && order.tripId !== trip.id) throw fieldError("tripId", "The order is not on this trip.", "inconsistent");
    if (order && stop && order.stopId !== stop.id) throw fieldError("stopId", "The order is not delivered at this stop.", "inconsistent");
    if (trip && stop && stop.tripId !== trip.id) throw fieldError("stopId", "The stop is not on this trip.", "inconsistent");
    if (orderItemId && !order.items.some((item) => item.id === orderItemId)) {
        throw fieldError("orderItemId", "The item does not belong to this order.", "inconsistent");
    }
};

const assertTypeAllowed = (role, type) => {
    if (!ALLOWED_TYPES[role]?.includes(type)) {
        throw fieldError("type", `This role cannot report an issue of type ${type}.`, "invalid_type");
    }
};

const assertDescription = (role, description) => {
    if (role === Role.STORE_MANAGER && !description) throw fieldError("description", "A description is required.", "required");
    if (role === Role.DRIVER && description && description.length > DRIVER_DESCRIPTION_MAX) {
        throw fieldError("description", `Must be at most ${DRIVER_DESCRIPTION_MAX} characters.`, "too_big");
    }
};

// ---- writing an issue ----

const insertIssueTx = async (tx, { source, type, targets, orderItemId, expectedQty, actualQty, description, reportedById, reportedAtDevice, clientMutationId, photoFileIds }) => {
    const issue = await createIssueTx(tx, {
        reference: issueReference(await nextIssueNumberTx(tx)),
        source,
        type,
        orderId: targets.order?.id ?? null,
        tripId: targets.trip?.id ?? null,
        stopId: targets.stop?.id ?? null,
        orderItemId: orderItemId ?? null,
        expectedQty: expectedQty ?? null,
        actualQty: actualQty ?? null,
        description: description ?? null,
        reportedById,
        reportedAtDevice: reportedAtDevice ?? null,
        clientMutationId: clientMutationId ?? null,
    });
    if (photoFileIds.length > 0) await createIssuePhotosTx(tx, issue.id, photoFileIds);
    return issue;
};

// A retry of a report answers with the issue created the first time; another user's id is a clash.
const findReplay = async (userId, clientMutationId) => {
    if (!clientMutationId) return null;
    const existing = await findIssueByClientMutationId(clientMutationId);
    if (!existing) return null;
    if (existing.reportedBy.id !== userId) {
        throw new AppError("This clientMutationId was already used by someone else.", 409, [
            { field: "clientMutationId", message: "Already in use.", code: "unique" },
        ]);
    }
    return toIssueCreatedDTO(existing, { created: false });
};

// ---- endpoints ----

export const createIssueService = async ({ userId, input }) => {
    const scope = await usersService.getScope(userId);
    if (!ALLOWED_TYPES[scope.role]) throw new AppError("Your role cannot report issues.", 403);

    const replay = await findReplay(userId, input.clientMutationId);
    if (replay) return replay;

    assertTypeAllowed(scope.role, input.type);
    assertDescription(scope.role, input.description);
    if (scope.role === Role.STORE_MANAGER && (input.tripId || input.stopId)) {
        throw fieldError(input.tripId ? "tripId" : "stopId", "Store managers report issues on an order.", "invalid");
    }

    const targets = await loadTargets(input);
    assertTargetScope(scope, targets);
    assertTargetsConsistent(targets, input.orderItemId);

    const [reporter, depotDispatcherIds] = await Promise.all([
        usersService.getUserProfile(userId),
        targets.depotId ? notificationsService.usersOfDepot(targets.depotId, Role.DISPATCHER) : [],
    ]);

    try {
        const issueId = await getPrisma().$transaction(async (tx) => {
            const photoFileIds = await filesService.assertAttachableTx(tx, {
                fileIds: input.photoFileIds,
                kind: "ISSUE_PHOTO",
                userId,
            });

            const issue = await insertIssueTx(tx, {
                source: scope.role,
                type: input.type,
                targets,
                orderItemId: input.orderItemId,
                expectedQty: input.expectedQty,
                actualQty: input.actualQty,
                description: input.description,
                reportedById: userId,
                reportedAtDevice: input.reportedAtDevice,
                clientMutationId: input.clientMutationId,
                photoFileIds,
            });

            await notificationsService.notifyUsersTx(
                tx,
                depotDispatcherIds.filter((dispatcherId) => dispatcherId !== userId),
                notificationsService.buildIssueReportedNotification({
                    issueId: issue.id,
                    reference: issue.reference,
                    type: input.type,
                    reporterName: reporter.fullName,
                    orderReference: targets.order?.reference,
                }),
            );

            return issue.id;
        }, TX_OPTIONS);

        return toIssueCreatedDTO(await findIssueDetailById(issueId), { created: true });
    } catch (error) {
        // the same report sent twice at the same moment: the loser answers like a retry
        if (error?.code === "P2002") {
            const replayed = await findReplay(userId, input.clientMutationId);
            if (replayed) return replayed;
        }
        throw error;
    }
};

// Store managers see issues on their outlet's orders (not the system's offline-sync conflicts, which are an
// internal matter), dispatchers those of their depots, and everyone the issues they reported themselves.
const scopeWhere = (scope) => {
    if (scope.role === Role.ADMIN) return {};
    if (scope.role === Role.DISPATCHER) {
        const depot = { in: scope.depotIds };
        return {
            OR: [
                { order: { depotId: depot } },
                { trip: { plan: { depotId: depot } } },
                { stop: { trip: { plan: { depotId: depot } } } },
                { reportedById: scope.userId },
            ],
        };
    }
    if (scope.role === Role.STORE_MANAGER) {
        return {
            OR: [
                { order: { outletId: scope.outletId ?? "" }, type: { not: IssueType.SYNC_CONFLICT } },
                { reportedById: scope.userId },
            ],
        };
    }
    return { reportedById: scope.userId };
};

// issues that belong to a depot: through their order, their trip or their stop
const depotWhere = (depotId) => ({
    OR: [{ order: { depotId } }, { trip: { plan: { depotId } } }, { stop: { trip: { plan: { depotId } } } }],
});

const assertCanView = (scope, issue) => {
    if (scope.role === Role.ADMIN) return;

    const links = toIssueLinksDTO(issue);
    if (links.reportedById === scope.userId) return;
    if (scope.role === Role.DISPATCHER && links.depotIds.some((depotId) => scope.depotIds.includes(depotId))) return;
    if (scope.role === Role.STORE_MANAGER && links.outletId && links.outletId === scope.outletId && issue.type !== IssueType.SYNC_CONFLICT) {
        return;
    }

    throw new AppError("You do not have access to this resource.", 403);
};

export const listIssuesService = async ({ userId, depotId, status, source, type, orderId, tripId, from, to, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    if (depotId) assertDepotAccess(scope, depotId);

    // from / to are business-calendar days: the whole of 'to' counts
    const createdAt = {
        ...(from && { gte: toUtcInstant(from, "00:00") }),
        ...(to && { lt: toUtcInstant(addDays(to, 1), "00:00") }),
    };
    const filters = {
        ...(status && { status }),
        ...(source && { source }),
        ...(type && { type }),
        ...(orderId && { orderId }),
        ...(tripId && { tripId }),
        ...((from || to) && { createdAt }),
    };

    const { rows, total } = await listIssues({
        where: { AND: [scopeWhere(scope), depotId ? depotWhere(depotId) : {}, filters] },
        skip: (page - 1) * pageSize,
        take: pageSize,
    });
    return toIssueListDTO(rows, { page, pageSize, total });
};

export const getIssueService = async ({ userId, id }) => {
    const scope = await usersService.getScope(userId);

    const issue = await findIssueDetailById(id);
    if (!issue) throw new AppError("Issue not found.", 404);
    assertCanView(scope, issue);

    return toIssueDTO(issue);
};

export const updateIssueStatusService = async ({ userId, id, status, resolutionNote, context, now = new Date() }) => {
    const scope = await usersService.getScope(userId);

    const before = await findIssueDetailById(id);
    if (!before) throw new AppError("Issue not found.", 404);

    // only the dispatchers of the issue's depot decide about it
    const links = toIssueLinksDTO(before);
    if (scope.role !== Role.DISPATCHER || !links.depotIds.some((depotId) => scope.depotIds.includes(depotId))) {
        throw new AppError("You do not have access to this resource.", 403);
    }

    const changeConflict = (currentStatus) =>
        new AppError(`Issue ${before.reference} is ${currentStatus} and cannot be changed to ${status}.`, 409, [
            { issueId: id, reference: before.reference, currentStatus, requestedStatus: status },
        ]);
    if (!(STATUS_TRANSITIONS[before.status] ?? []).includes(status)) throw changeConflict(before.status);

    await getPrisma().$transaction(async (tx) => {
        const { count } = await updateIssueStatusTx(tx, {
            id,
            fromStatus: before.status,
            data: {
                status,
                ...(status === "RESOLVED" && { resolvedById: userId, resolvedAt: now, resolutionNote: resolutionNote ?? null }),
            },
        });
        if (count !== 1) throw changeConflict("changed by another request");

        if (before.reportedBy.id !== userId) {
            await notificationsService.notifyUsersTx(
                tx,
                [before.reportedBy.id],
                notificationsService.buildIssueUpdateNotification({
                    issueId: id,
                    reference: before.reference,
                    status,
                    resolutionNote,
                }),
            );
        }

        await auditService.recordTx(tx, {
            ...context,
            action: "ISSUE_STATUS_CHANGED",
            entityType: "Issue",
            entityId: id,
            before: toIssueSnapshot(before),
            after: { status, resolvedAt: status === "RESOLVED" ? now : null, resolutionNote: status === "RESOLVED" ? (resolutionNote ?? null) : null },
        });
    }, TX_OPTIONS);

    return toIssueDTO(await findIssueDetailById(id));
};

// ---- used by other services ----

// Creates an issue raised by the system (LOADING_SHORTFALL after a short loading, SYNC_CONFLICT for an
// offline mutation the server had to reject) inside the caller's transaction. The depot's dispatchers
// are notified unless notifyDispatchers is false (the caller sends a more specific notification).
// Returns { id, reference }.
export const createSystemIssueTx = async (tx, { type, orderId, tripId, stopId, description, reportedById, notifyDispatchers = true }) => {
    if (!SYSTEM_TYPES.includes(type)) throw new AppError("Only system issue types can be created here.", 500, null, false);
    if (!orderId && !tripId && !stopId) throw new AppError("A system issue needs an order, a trip or a stop.", 500, null, false);

    const targets = await loadTargets({ orderId, tripId, stopId }, tx);
    const issue = await insertIssueTx(tx, {
        source: "SYSTEM",
        type,
        targets,
        description,
        reportedById,
        photoFileIds: [],
    });

    if (notifyDispatchers && targets.depotId) {
        await notificationsService.notifyUsersTx(
            tx,
            await notificationsService.usersOfDepot(targets.depotId, Role.DISPATCHER),
            notificationsService.buildIssueReportedNotification({
                issueId: issue.id,
                reference: issue.reference,
                type,
                orderReference: targets.order?.reference,
            }),
        );
    }

    return issue;
};
