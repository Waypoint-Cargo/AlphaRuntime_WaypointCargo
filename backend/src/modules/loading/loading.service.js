import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { fromYmd, todayBusinessDate } from "../../utils/businessTime.js";
import * as usersService from "../users/users.service.js";
import * as auditService from "../audit/audit.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as tripsService from "../trips/trips.service.js";
import * as issuesService from "../issues/issues.service.js";
import {
    countChecksBySession,
    countChecksByStatus,
    countTripChecksByStatusTx,
    countTripItemsTx,
    countTripsByStatus,
    findCheckByClientMutationIdTx,
    findCheckTx,
    findChecksByItemsTx,
    findTaskDetail,
    listTasks,
    listTripChecksTx,
    lockSessionTx,
    updateCheckTx,
    updateSessionTx,
} from "./loading.repository.js";
import {
    toCheckResultDTO,
    toLoadingSummaryDTO,
    toShortItemsDTO,
    toTaskDetailDTO,
    toTaskListDTO,
} from "./loading.dto.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

// trips of a published plan are loading tasks, also once the plan is under way or finished
const TASK_PLAN_STATUSES = ["PUBLISHED", "IN_EXECUTION", "COMPLETED"];
// loading can be started while the plan has not been completed
const LOADABLE_PLAN_STATUSES = ["PUBLISHED", "IN_EXECUTION"];

const MAX_ITEMS_IN_MESSAGE = 8;

const fieldError = (field, message, code = "invalid") => new AppError("Validation failed.", 422, [{ field, message, code }]);

const assertLoader = (scope) => {
    if (scope.role !== Role.LOADER) throw new AppError("Only loaders can do this.", 403);
};

// a loader works on the trips of their own depots
const tasksWhere = (scope, { date, brand, q }) => ({
    plan: { depotId: { in: scope.depotIds }, status: { in: TASK_PLAN_STATUSES } },
    deliveryDate: fromYmd(date),
    status: { not: "CANCELLED" },
    ...(brand && { stops: { some: { allocations: { some: { order: { brand } } } } } }),
    ...(q && {
        OR: [
            { code: { contains: q, mode: "insensitive" } },
            { vehicle: { code: { contains: q, mode: "insensitive" } } },
            { driver: { fullName: { contains: q, mode: "insensitive" } } },
            {
                stops: {
                    some: {
                        outlet: {
                            OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }],
                        },
                    },
                },
            },
        ],
    }),
});

const notLoading = (trip) =>
    new AppError(`Trip ${trip.code} is ${trip.status}; items can only be checked while it is LOADING.`, 409, [
        { code: "TRIP_NOT_LOADING", tripId: trip.id, currentStatus: trip.status },
    ]);

const noSession = () => new AppError("Loading is not available for this trip.", 409, [{ code: "NO_LOADING_SESSION" }]);

// one task in full; 404 when the trip is not a loading task, 403 outside the loader's depots
const loadTaskDetail = async (scope, tripId, tx) => {
    const trip = await findTaskDetail(tripId, tx);
    if (!trip || !TASK_PLAN_STATUSES.includes(trip.plan.status)) throw new AppError("Loading task not found.", 404);
    assertDepotAccess(scope, trip.plan.depotId);
    return toTaskDetailDTO(trip);
};

// ---- reads ----

export const getLoadingSummaryService = async ({ userId, date }) => {
    const scope = await usersService.getScope(userId);
    const day = date ?? todayBusinessDate();
    const where = tasksWhere(scope, { date: day });

    const [tripGroups, checkGroups] = await Promise.all([countTripsByStatus(where), countChecksByStatus(where)]);
    return toLoadingSummaryDTO({ date: day, tripGroups, checkGroups });
};

export const listLoadingTasksService = async ({ userId, date, brand, q, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    const where = tasksWhere(scope, { date: date ?? todayBusinessDate(), brand, q });

    const { rows, total } = await listTasks({ where, skip: (page - 1) * pageSize, take: pageSize });
    const sessionIds = rows.map((trip) => trip.loadingSession?.id).filter(Boolean);
    const checkGroups = sessionIds.length > 0 ? await countChecksBySession(sessionIds) : [];

    return toTaskListDTO(rows, checkGroups, { page, pageSize, total });
};

export const getLoadingTaskService = async ({ userId, tripId }) => {
    const scope = await usersService.getScope(userId);
    return loadTaskDetail(scope, tripId);
};

// ---- start ----

// PLANNED -> LOADING. Starting a trip that is already LOADING changes nothing and answers with the task.
export const startLoadingService = async ({ userId, tripId, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    assertLoader(scope);

    const trip = await tripsService.getTripRef(tripId);
    assertDepotAccess(scope, trip.depotId);
    if (!LOADABLE_PLAN_STATUSES.includes(trip.planStatus)) {
        throw new AppError(`The plan is ${trip.planStatus}; loading can only start on a published plan.`, 409);
    }

    await getPrisma().$transaction(async (tx) => {
        if (!(await lockSessionTx(tx, tripId))) throw noSession();

        const current = await tripsService.getTripRef(tripId, tx);
        if (current.status === "LOADING") return;

        await tripsService.transitionTripTx(tx, { tripId, toStatus: "LOADING", at: now });
        await updateSessionTx(tx, tripId, { startedById: userId, startedAt: now });
    }, TX_OPTIONS);

    return loadTaskDetail(scope, tripId);
};

// ---- item checks ----

// the status a check gets: the one the loader chose, or VERIFIED / SHORT from the quantity
const resolveCheckStatus = ({ loadedQty, plannedQty, status }) => {
    if (loadedQty > plannedQty) throw fieldError("loadedQty", `Cannot be more than the planned quantity (${plannedQty}).`, "too_big");
    if (!status) return loadedQty === plannedQty ? "VERIFIED" : "SHORT";
    if (status === "VERIFIED" && loadedQty !== plannedQty) {
        throw fieldError("status", "VERIFIED needs the full planned quantity.");
    }
    if (status === "SHORT" && loadedQty >= plannedQty) {
        throw fieldError("status", "SHORT needs less than the planned quantity.");
    }
    return status;
};

// Records what a loader found for one item while the trip is LOADING. Used by PATCH
// /loading/tasks/:tripId/items/:orderItemId and by the offline sync (LOAD_ITEM_CHECKED).
// A repeated clientMutationId answers with the item as it is now. user = { id }.
export const checkItem = async (user, { tripId, orderItemId, loadedQty, status, clientMutationId, now = new Date() }) => {
    const scope = await usersService.getScope(user.id);
    assertLoader(scope);

    const trip = await tripsService.getTripRef(tripId);
    assertDepotAccess(scope, trip.depotId);

    return getPrisma().$transaction(async (tx) => {
        if (!(await lockSessionTx(tx, tripId))) throw noSession();

        if (clientMutationId) {
            const used = await findCheckByClientMutationIdTx(tx, clientMutationId);
            if (used) {
                if (used.session.tripId !== tripId || used.orderItemId !== orderItemId) {
                    throw new AppError("This clientMutationId was already used for another item.", 409, [
                        { field: "clientMutationId", message: "Already in use.", code: "unique" },
                    ]);
                }
                return toCheckResultDTO(used, { tripId, progressRows: await countTripChecksByStatusTx(tx, tripId) });
            }
        }

        const current = await tripsService.getTripRef(tripId, tx);
        if (current.status !== "LOADING") throw notLoading(current);

        const check = await findCheckTx(tx, { tripId, orderItemId });
        if (!check) throw new AppError("Item not found on this trip.", 404);

        const updated = await updateCheckTx(tx, check.id, {
            loadedQty,
            status: resolveCheckStatus({ loadedQty, plannedQty: check.plannedQty, status }),
            checkedById: user.id,
            checkedAt: now,
            ...(clientMutationId && { clientMutationId }),
        });

        return toCheckResultDTO(updated, { tripId, progressRows: await countTripChecksByStatusTx(tx, tripId) });
    }, TX_OPTIONS);
};

// ---- completion ----

const describeShortfall = (tripCode, shortItems) => {
    const lines = shortItems
        .slice(0, MAX_ITEMS_IN_MESSAGE)
        .map((item) => `${item.itemName}: loaded ${item.loadedQty} of ${item.plannedQty} ${item.unit} (${item.status})`);
    const more = shortItems.length > MAX_ITEMS_IN_MESSAGE ? `; and ${shortItems.length - MAX_ITEMS_IN_MESSAGE} more` : "";
    return `Route ${tripCode} left the depot short on ${shortItems.length} ${shortItems.length === 1 ? "item" : "items"}. ${lines.join("; ")}${more}`;
};

// Finishes loading: the trip becomes LOADED, its orders LOADED (or PARTIALLY_LOADED when something was
// short). Every item needs a check. A shortfall needs departShort = true: the loader decides to go
// without the missing items, which raises a LOADING_SHORTFALL issue and tells the depot's dispatchers and
// the outlets that will receive less. Completing a trip that is already LOADED changes nothing.
// Used by POST /loading/tasks/:tripId/complete and by the offline sync (LOADING_COMPLETED).
// user = { id }; context = { ip, requestId } for the audit entry.
export const completeLoading = async (user, { tripId, departShort = false, context = {}, now = new Date() }) => {
    const scope = await usersService.getScope(user.id);
    assertLoader(scope);

    const trip = await tripsService.getTripRef(tripId);
    assertDepotAccess(scope, trip.depotId);

    await getPrisma().$transaction(async (tx) => {
        if (!(await lockSessionTx(tx, tripId))) throw noSession();

        const current = await tripsService.getTripRef(tripId, tx);
        if (current.status === "LOADED") return;
        if (current.status !== "LOADING") throw notLoading(current);

        const checks = await listTripChecksTx(tx, tripId);
        const itemCount = await countTripItemsTx(tx, tripId);
        const pendingItems = checks.filter((check) => check.status === "PENDING").length + Math.max(0, itemCount - checks.length);
        if (pendingItems > 0) {
            throw new AppError(`${pendingItems} ${pendingItems === 1 ? "item has" : "items have"} not been checked yet.`, 409, [
                { code: "ITEMS_PENDING", pendingItems },
            ]);
        }

        const shortItems = toShortItemsDTO(checks);
        const hasShortfall = shortItems.length > 0;
        if (hasShortfall && !departShort) {
            throw new AppError(
                `${shortItems.length} ${shortItems.length === 1 ? "item is" : "items are"} short. Send departShort = true to leave without them.`,
                409,
                [{ code: "SHORTFALL_UNRESOLVED", shortItems: shortItems.length, items: shortItems }],
            );
        }

        await updateSessionTx(tx, tripId, { completedById: user.id, completedAt: now, departedShort: hasShortfall });
        await tripsService.transitionTripTx(tx, { tripId, toStatus: "LOADED", at: now });

        const orders = await tripsService.listTripOrdersTx(tx, tripId);
        const shortOrderIds = new Set(shortItems.map((item) => item.orderId));
        const loadedOrders = orders.filter((order) => !shortOrderIds.has(order.orderId));
        const partialOrders = orders.filter((order) => shortOrderIds.has(order.orderId));

        await ordersService.transitionOrdersTx(tx, {
            orderIds: loadedOrders.map((order) => order.orderId),
            toStatus: "LOADED",
            actorId: user.id,
            data: { tripId },
        });
        await ordersService.transitionOrdersTx(tx, {
            orderIds: partialOrders.map((order) => order.orderId),
            toStatus: "PARTIALLY_LOADED",
            actorId: user.id,
            reason: "Loading shortfall",
            data: { tripId, shortItems: shortItems.filter((item) => shortOrderIds.has(item.orderId)).length },
        });

        if (hasShortfall) {
            await issuesService.createSystemIssueTx(tx, {
                type: "LOADING_SHORTFALL",
                tripId,
                description: describeShortfall(current.code, shortItems),
                reportedById: user.id,
                notifyDispatchers: false, // the shortfall notification below says more
            });

            const [dispatcherIds, managersByOutlet] = await Promise.all([
                notificationsService.usersOfDepot(current.depotId, Role.DISPATCHER),
                notificationsService.storeManagersOfOutlets([...new Set(partialOrders.map((order) => order.outletId))]),
            ]);
            await notificationsService.notifyManyTx(tx, [
                {
                    userIds: dispatcherIds,
                    payload: notificationsService.buildLoadingShortfallNotification({
                        audience: "dispatcher",
                        tripId,
                        tripCode: current.code,
                        shortItems: shortItems.length,
                    }),
                },
                ...partialOrders.map((order) => ({
                    userIds: managersByOutlet.get(order.outletId) ?? [],
                    payload: notificationsService.buildLoadingShortfallNotification({
                        audience: "storeManager",
                        orderId: order.orderId,
                        reference: order.reference,
                        shortItems: shortItems.filter((item) => item.orderId === order.orderId).length,
                    }),
                })),
            ]);
        }

        await auditService.recordTx(tx, {
            ...context,
            actorId: user.id,
            action: "LOADING_COMPLETED",
            entityType: "Trip",
            entityId: tripId,
            before: { status: "LOADING" },
            after: {
                status: "LOADED",
                departedShort: hasShortfall,
                shortItems: shortItems.length,
                loadedOrders: loadedOrders.length,
                partiallyLoadedOrders: partialOrders.length,
            },
        });
    }, TX_OPTIONS);

    return loadTaskDetail(scope, tripId);
};

// ---- used by other services ----

// What was loaded for each order item: Map(orderItemId -> { plannedQty, loadedQty, status }).
// Items without a check are absent from the map.
export const getLoadedQuantitiesTx = async (tx, orderItemIds) => {
    if (orderItemIds.length === 0) return new Map();
    const checks = await findChecksByItemsTx(tx, orderItemIds);
    return new Map(checks.map((check) => [check.orderItemId, check]));
};
