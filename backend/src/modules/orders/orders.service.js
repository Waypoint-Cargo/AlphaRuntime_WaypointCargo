import { AppError } from "../../utils/appError.js";
import { Brand, OrderStatus, Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess, assertOutletAccess } from "../../utils/scope.js";
import {
    businessMinutesOfDay,
    fromYmd,
    minutesToHHMM,
    todayBusinessDate,
    toYmd,
} from "../../utils/businessTime.js";
import { roundTo, toNumber } from "../../utils/serialize.js";
import * as usersService from "../users/users.service.js";
import * as referenceService from "../reference/reference.service.js";
import * as fleetService from "../fleet/fleet.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import {
    countOrdersByStatus,
    countOrdersByStatusAndBrand,
    createOrderEventTx,
    createOrderTx,
    findOrderCore,
    findOrderDetailById,
    findOrderForPlanning,
    findOrderRef,
    findOrderStatusesTx,
    listOrders,
    listOrdersOfDepotDate,
    listQueueOrders,
    nextOrderNumberTx,
    replaceOrderItemsTx,
    updateOrderEditTx,
    updateOrderFieldsTx,
    updateOrderStatusTx,
} from "./orders.repository.js";
import {
    toOrderChecksDTO,
    toOrderConfirmationDTO,
    toOrderCountsDTO,
    toOrderDetailDTO,
    toOrderListDTO,
    toOrderPlanningDTO,
    toOrderRefDTO,
    toQueueOrderDTO,
} from "./orders.dto.js";

// writes that touch many rows get more time than Prisma's 5 s default
const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const EDITABLE_STATUSES = [OrderStatus.DRAFT, OrderStatus.PENDING_REVIEW];

// ---- status machine ----
// The only place that knows which status may follow which. Every status change in the
// backend goes through transitionOrdersTx.

const TRANSITIONS = {
    DRAFT: ["PENDING_REVIEW", "CANCELLED"],
    PENDING_REVIEW: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PLANNED", "DEFERRED", "CANCELLED"],
    DEFERRED: ["PLANNED", "CONFIRMED"],
    PLANNED: ["CONFIRMED", "DEFERRED", "LOADED", "PARTIALLY_LOADED"],
    LOADED: ["IN_TRANSIT"],
    PARTIALLY_LOADED: ["IN_TRANSIT"],
    IN_TRANSIT: ["DELIVERED", "PARTIALLY_DELIVERED", "FAILED"],
    DELIVERED: ["RECEIVED", "RECEIVED_WITH_ISSUES"],
    PARTIALLY_DELIVERED: ["RECEIVED", "RECEIVED_WITH_ISSUES"],
};

const invalidTransition = (rows, toStatus) =>
    new AppError(
        rows.length === 1
            ? `Order ${rows[0].reference} is ${rows[0].status} and cannot be changed to ${toStatus}.`
            : `${rows.length} orders cannot be changed to ${toStatus} from their current status.`,
        409,
        rows.map((row) => ({
            orderId: row.id,
            reference: row.reference,
            currentStatus: row.status,
            requestedStatus: toStatus,
        })),
    );

// Moves orders to a new status, validating each against the table above and writing one
// OrderEvent per order. Returns [{ id, reference, fromStatus, toStatus }].
export const transitionOrdersTx = async (tx, { orderIds, toStatus, actorId, reason, data }) => {
    const ids = [...new Set(orderIds)];
    if (ids.length === 0) return [];

    const rows = await findOrderStatusesTx(tx, ids);
    if (rows.length !== ids.length) throw new AppError("Order not found.", 404);

    const invalid = rows.filter((row) => !(TRANSITIONS[row.status] ?? []).includes(toStatus));
    if (invalid.length > 0) throw invalidTransition(invalid, toStatus);

    for (const row of rows) {
        // compare-and-set: a concurrent change since the read above turns into a 409
        const { count } = await updateOrderStatusTx(tx, row.id, row.status, toStatus);
        if (count !== 1) throw invalidTransition([{ ...row, status: "CHANGED_CONCURRENTLY" }], toStatus);

        await createOrderEventTx(tx, {
            orderId: row.id,
            fromStatus: row.status,
            toStatus,
            actorId: actorId ?? null,
            reason: reason ?? null,
            ...(data !== undefined && { data }),
        });
    }

    return rows.map((row) => ({ id: row.id, reference: row.reference, fromStatus: row.status, toStatus }));
};

// ---- helpers ----

const requireManagerOutlet = (scope) => {
    if (scope.role !== Role.STORE_MANAGER || !scope.outletId) {
        throw new AppError("Your account is not assigned to an outlet.", 403);
    }
    return scope.outletId;
};

// store managers: their own outlet; dispatchers/loaders: their depots; admin: everything
const assertOrderScope = (scope, order) => {
    if (scope.role === Role.STORE_MANAGER) assertOutletAccess(scope, order.outletId);
    else assertDepotAccess(scope, order.depotId);
};

const scopeWhere = (scope) => {
    if (scope.role === Role.STORE_MANAGER) return { outletId: scope.outletId ?? "" };
    if (scope.role === Role.ADMIN) return {};
    return { depotId: { in: scope.depotIds } };
};

const labelFor = (reason, audience) => notificationsService.deferralReasonLabel(reason, audience);

// totals are computed in hundredths / thousandths so sums carry no floating-point noise
const normalizeItems = (items) =>
    items.map((item) => ({
        itemName: item.itemName,
        sku: item.sku ?? null,
        ...(item.unit !== undefined && { unit: item.unit }),
        quantity: item.quantity,
        weightKg: roundTo(item.weightKg, 2),
        volumeM3: roundTo(item.volumeM3, 3),
        notes: item.notes ?? null,
    }));

const computeTotals = (items) => ({
    totalWeightKg: items.reduce((sum, item) => sum + Math.round(item.weightKg * 100), 0) / 100,
    totalVolumeM3: items.reduce((sum, item) => sum + Math.round(item.volumeM3 * 1000), 0) / 1000,
    itemCount: items.length,
});

const orderReference = (value) => `ORD-${String(value).padStart(6, "0")}`;

const loadDetail = async (orderId, scope) => {
    const order = await findOrderDetailById(orderId);
    return toOrderDetailDTO(order, scope.role, labelFor);
};

// Loads an order, 404s, and checks the caller may see it.
const loadScopedCore = async (orderId, scope, tx) => {
    const order = await findOrderCore(orderId, tx);
    if (!order) throw new AppError("Order not found.", 404);
    assertOrderScope(scope, order);
    return order;
};

// ---- submit (shared by create-and-submit and POST /orders/:id/submit) ----

// DRAFT -> PENDING_REVIEW inside the caller's transaction:
// resolve the delivery date, snapshot the outlet's constraints, tell the managers if it rolled over.
const submitInTx = async (tx, { orderId, reference, requestedDate, outlet, resolved, actorId, managerIds, now }) => {
    await updateOrderFieldsTx(tx, orderId, {
        deliveryDate: fromYmd(resolved.deliveryDate),
        rolledOver: resolved.rolledOver,
        cutoffAt: resolved.cutoffAt,
        submittedAt: now,
        windowStartMin: outlet.window.startMin,
        windowEndMin: outlet.window.endMin,
        vanOnly: outlet.vanOnly,
        isMall: outlet.isMall,
        unloadingType: outlet.unloadingType,
    });

    await transitionOrdersTx(tx, {
        orderIds: [orderId],
        toStatus: OrderStatus.PENDING_REVIEW,
        actorId,
        data: { deliveryDate: resolved.deliveryDate, rolledOver: resolved.rolledOver },
    });

    if (resolved.rolledOver) {
        await notificationsService.notifyUsersTx(
            tx,
            managerIds,
            notificationsService.buildOrderRolledOverNotification({
                orderId,
                reference,
                requestedDate,
                deliveryDate: resolved.deliveryDate,
            }),
        );
    }
};

// ---- endpoints ----

export const createOrderService = async ({
    userId,
    tempClass,
    requestedDeliveryDate,
    items,
    specialInstructions,
    isFragile,
    isHighValue,
    submit,
    now = new Date(),
}) => {
    const scope = await usersService.getScope(userId);
    const outletId = requireManagerOutlet(scope);

    const outlet = await referenceService.getOutlet(outletId);
    if (!outlet.isActive) throw new AppError("Your outlet is not active.", 409);

    await referenceService.validateRequestedDate(requestedDeliveryDate, now);
    const resolved = submit ? await referenceService.resolveDeliveryDate({ requestedDate: requestedDeliveryDate, now }) : null;
    const managerIds = resolved?.rolledOver ? await notificationsService.storeManagersOfOutlet(outletId) : [];

    const normalized = normalizeItems(items);
    const totals = computeTotals(normalized);

    const db = getPrisma();
    const orderId = await db.$transaction(async (tx) => {
        const reference = orderReference(await nextOrderNumberTx(tx));

        const created = await createOrderTx(tx, {
            reference,
            outletId,
            depotId: outlet.depotId,
            brand: outlet.brand,
            tempClass,
            requestedDeliveryDate: fromYmd(requestedDeliveryDate),
            deliveryDate: fromYmd(requestedDeliveryDate), // a draft keeps the requested date until it is submitted
            rolledOver: false,
            specialInstructions: specialInstructions ?? null,
            isFragile: isFragile ?? false,
            isHighValue: isHighValue ?? false,
            createdById: userId,
            ...totals,
            items: { create: normalized.map((item, index) => ({ lineNo: index + 1, ...item })) },
        });

        await createOrderEventTx(tx, { orderId: created.id, fromStatus: null, toStatus: OrderStatus.DRAFT, actorId: userId });

        if (submit) {
            await submitInTx(tx, {
                orderId: created.id,
                reference,
                requestedDate: requestedDeliveryDate,
                outlet,
                resolved,
                actorId: userId,
                managerIds,
                now,
            });
        }
        return created.id;
    }, TX_OPTIONS);

    return loadDetail(orderId, scope);
};

export const updateOrderService = async ({
    userId,
    id,
    version,
    tempClass,
    requestedDeliveryDate,
    items,
    specialInstructions,
    isFragile,
    isHighValue,
    now = new Date(),
}) => {
    const scope = await usersService.getScope(userId);
    requireManagerOutlet(scope);
    const core = await loadScopedCore(id, scope);

    if (!EDITABLE_STATUSES.includes(core.status)) {
        throw new AppError(`Order ${core.reference} is ${core.status} and can no longer be edited.`, 409);
    }
    if (core.version !== version) {
        throw new AppError("The order was changed by someone else. Reload it and try again.", 409, {
            currentVersion: core.version,
        });
    }

    const requestedDate = requestedDeliveryDate ?? toYmd(core.requestedDeliveryDate);
    if (requestedDeliveryDate !== undefined) await referenceService.validateRequestedDate(requestedDate, now);

    const data = {
        ...(tempClass !== undefined && { tempClass }),
        ...(specialInstructions !== undefined && { specialInstructions }),
        ...(isFragile !== undefined && { isFragile }),
        ...(isHighValue !== undefined && { isHighValue }),
    };

    if (core.status === OrderStatus.PENDING_REVIEW) {
        // a submitted order has a resolved date: re-run the resolution
        const resolved = await referenceService.resolveDeliveryDate({ requestedDate, now });
        Object.assign(data, {
            requestedDeliveryDate: fromYmd(requestedDate),
            deliveryDate: fromYmd(resolved.deliveryDate),
            rolledOver: resolved.rolledOver,
            cutoffAt: resolved.cutoffAt,
        });
    } else if (requestedDeliveryDate !== undefined) {
        Object.assign(data, {
            requestedDeliveryDate: fromYmd(requestedDate),
            deliveryDate: fromYmd(requestedDate),
            rolledOver: false,
        });
    }

    const normalized = items ? normalizeItems(items) : null;
    if (normalized) Object.assign(data, computeTotals(normalized));

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        const { count } = await updateOrderEditTx(tx, { id, version, statuses: EDITABLE_STATUSES, data });
        if (count !== 1) {
            throw new AppError("The order was changed by someone else. Reload it and try again.", 409);
        }
        if (normalized) await replaceOrderItemsTx(tx, id, normalized.map((item, index) => ({ lineNo: index + 1, ...item })));

        await createOrderEventTx(tx, {
            orderId: id,
            fromStatus: core.status,
            toStatus: core.status,
            actorId: userId,
            reason: "Order edited",
        });
    }, TX_OPTIONS);

    return loadDetail(id, scope);
};

export const submitOrderService = async ({ userId, id, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    requireManagerOutlet(scope);
    const core = await loadScopedCore(id, scope);
    if (core.status !== OrderStatus.DRAFT) {
        throw new AppError(`Order ${core.reference} is ${core.status} and cannot be submitted.`, 409);
    }

    const outlet = await referenceService.getOutlet(core.outletId);
    if (!outlet.isActive) throw new AppError("Your outlet is not active.", 409);

    const requestedDate = toYmd(core.requestedDeliveryDate);
    const resolved = await referenceService.resolveDeliveryDate({ requestedDate, now });
    const managerIds = resolved.rolledOver ? await notificationsService.storeManagersOfOutlet(core.outletId) : [];

    const db = getPrisma();
    await db.$transaction(
        (tx) =>
            submitInTx(tx, {
                orderId: id,
                reference: core.reference,
                requestedDate,
                outlet,
                resolved,
                actorId: userId,
                managerIds,
                now,
            }),
        TX_OPTIONS,
    );

    return loadDetail(id, scope);
};

// ---- fulfilment checks ----

const check = (code, label, status, message) => ({ code, label, status, message });

const describeOutletRequirements = (outlet) => {
    const parts = [];
    if (outlet.vanOnly) parts.push("van-only outlet");
    if (outlet.isMall) {
        const access = outlet.mallAccessWindow ?? outlet.window;
        parts.push(`mall outlet (access ${access.start}-${access.end})`);
    }
    if (outlet.unloadingType) parts.push(`unloading: ${outlet.unloadingType.toLowerCase().replace("_", " ")}`);
    return parts.length > 0 ? parts.join("; ") : "no special requirements";
};

// Pure: the order against the outlet, the depot's active vehicles and the calendar.
// There are no product-availability or driver-availability checks (no such data, and driver
// availability is not a constraint).
export const evaluateOrderChecks = ({ order, outlet, vehicles, cutoffAt, isOperatingDay, now }) => {
    const deliveryDate = order.deliveryDate;
    const checks = [];

    // CUTOFF
    if (now.getTime() > cutoffAt.getTime()) {
        checks.push(
            check(
                "CUTOFF",
                "Order cut-off",
                "FAIL",
                `The cut-off for ${deliveryDate} passed at ${minutesToHHMM(businessMinutesOfDay(cutoffAt))} on ${todayBusinessDate(cutoffAt)}. ` +
                    "This order will move to the next run.",
            ),
        );
    } else {
        checks.push(
            check(
                "CUTOFF",
                "Order cut-off",
                "PASS",
                `Orders for ${deliveryDate} are open until ${minutesToHHMM(businessMinutesOfDay(cutoffAt))} on ${todayBusinessDate(cutoffAt)}.`,
            ),
        );
    }

    // OPERATING_DAY
    checks.push(
        isOperatingDay
            ? check("OPERATING_DAY", "Operating day", "PASS", `${deliveryDate} is an operating day.`)
            : check("OPERATING_DAY", "Operating day", "FAIL", `Waypoint does not deliver on ${deliveryDate}.`),
    );

    // VEHICLE_TYPE, WEIGHT_FIT, VOLUME_FIT use the vehicles that could carry this order at all
    const needsCold = order.tempClass === "CHILLED" || order.tempClass === "FROZEN";
    const eligible = vehicles.filter((vehicle) => (!needsCold || vehicle.isRefrigerated) && (!outlet.vanOnly || vehicle.type === "VAN"));

    if (eligible.length === 0) {
        const what = needsCold && outlet.vanOnly ? "refrigerated van" : needsCold ? "refrigerated vehicle" : "van";
        const reason = `No active ${what} in ${outlet.depot?.name ?? "the depot"} can carry this order.`;
        checks.push(check("VEHICLE_TYPE", "Vehicle type", "FAIL", reason));
        checks.push(check("WEIGHT_FIT", "Weight fit", "FAIL", "No eligible vehicle to carry this order."));
        checks.push(check("VOLUME_FIT", "Volume fit", "FAIL", "No eligible vehicle to carry this order."));
    } else {
        checks.push(check("VEHICLE_TYPE", "Vehicle type", "PASS", `${eligible.length} eligible active vehicle(s) in the depot.`));

        const maxWeight = Math.max(...eligible.map((vehicle) => vehicle.maxWeightKg));
        const maxVolume = Math.max(...eligible.map((vehicle) => vehicle.maxVolumeM3));
        checks.push(
            order.totalWeightKg > maxWeight
                ? check("WEIGHT_FIT", "Weight fit", "FAIL", `The order weighs ${order.totalWeightKg} kg; the largest eligible vehicle carries ${maxWeight} kg.`)
                : check("WEIGHT_FIT", "Weight fit", "PASS", `${order.totalWeightKg} kg fits the largest eligible vehicle (${maxWeight} kg).`),
        );
        checks.push(
            order.totalVolumeM3 > maxVolume
                ? check("VOLUME_FIT", "Volume fit", "FAIL", `The order is ${order.totalVolumeM3} m³; the largest eligible vehicle holds ${maxVolume} m³.`)
                : check("VOLUME_FIT", "Volume fit", "PASS", `${order.totalVolumeM3} m³ fits the largest eligible vehicle (${maxVolume} m³).`),
        );
    }

    // OUTLET_REQUIREMENTS is informational
    checks.push(check("OUTLET_REQUIREMENTS", "Outlet requirements", "PASS", describeOutletRequirements(outlet)));
    return checks;
};

// checks for an order as it stands, or for a different delivery date (used by confirm after a roll-over)
const buildOrderChecks = async (core, { deliveryDate, now }) => {
    const outlet = await referenceService.getOutlet(core.outletId);
    const [cutoffAt, isOperatingDay, vehicles] = await Promise.all([
        referenceService.getCutoffAt(deliveryDate),
        referenceService.isOperatingDate(deliveryDate),
        fleetService.listActiveDepotVehicles(core.depotId),
    ]);

    return evaluateOrderChecks({
        order: { deliveryDate, tempClass: core.tempClass, totalWeightKg: toNumber(core.totalWeightKg), totalVolumeM3: toNumber(core.totalVolumeM3) },
        outlet,
        vehicles,
        cutoffAt,
        isOperatingDay,
        now,
    });
};

export const getOrderChecksService = async ({ userId, id, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    const core = await loadScopedCore(id, scope);
    return toOrderChecksDTO(await buildOrderChecks(core, { deliveryDate: toYmd(core.deliveryDate), now }));
};

// ---- confirm / cancel ----

export const confirmOrderService = async ({ userId, id, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    requireManagerOutlet(scope);
    const core = await loadScopedCore(id, scope);
    if (core.status !== OrderStatus.PENDING_REVIEW) {
        throw new AppError(`Order ${core.reference} is ${core.status} and cannot be confirmed.`, 409);
    }

    const previousDeliveryDate = toYmd(core.deliveryDate);
    let deliveryDate = previousDeliveryDate;
    let resolved = null;

    // the cut-off may have passed since submission: the order then rolls to the next run
    if (now.getTime() > (await referenceService.getCutoffAt(previousDeliveryDate)).getTime()) {
        resolved = await referenceService.resolveDeliveryDate({ requestedDate: toYmd(core.requestedDeliveryDate), now });
        deliveryDate = resolved.deliveryDate;
    }
    const rolledOver = deliveryDate !== previousDeliveryDate;

    const checks = await buildOrderChecks(core, { deliveryDate, now });
    const failed = checks.filter((item) => item.status === "FAIL");
    if (failed.length > 0) {
        throw new AppError(
            `The order cannot be confirmed: ${failed.map((item) => item.label.toLowerCase()).join(", ")}.`,
            422,
            { checks },
        );
    }

    const managerIds = await notificationsService.storeManagersOfOutlet(core.outletId);

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        await updateOrderFieldsTx(tx, id, {
            confirmedAt: now,
            ...(resolved && {
                deliveryDate: fromYmd(deliveryDate),
                rolledOver: resolved.rolledOver,
                cutoffAt: resolved.cutoffAt,
            }),
        });

        await transitionOrdersTx(tx, {
            orderIds: [id],
            toStatus: OrderStatus.CONFIRMED,
            actorId: userId,
            reason: rolledOver ? "The cut-off had passed; moved to the next run" : undefined,
            data: { deliveryDate, ...(rolledOver && { previousDeliveryDate }) },
        });

        await notificationsService.notifyUsersTx(
            tx,
            managerIds,
            notificationsService.buildOrderConfirmedNotification({
                orderId: id,
                reference: core.reference,
                deliveryDate,
                previousDeliveryDate: rolledOver ? previousDeliveryDate : undefined,
            }),
        );
    }, TX_OPTIONS);

    return toOrderConfirmationDTO(await loadDetail(id, scope), { rolledOver, previousDeliveryDate });
};

export const cancelOrderService = async ({ userId, id, reason, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    requireManagerOutlet(scope);
    const core = await loadScopedCore(id, scope);

    const cancellable = [OrderStatus.DRAFT, OrderStatus.PENDING_REVIEW, OrderStatus.CONFIRMED];
    if (!cancellable.includes(core.status)) {
        throw new AppError(`Order ${core.reference} is ${core.status} and can no longer be cancelled.`, 409);
    }

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        await transitionOrdersTx(tx, { orderIds: [id], toStatus: OrderStatus.CANCELLED, actorId: userId, reason });
        await updateOrderFieldsTx(tx, id, { cancelledAt: now });
    }, TX_OPTIONS);

    return loadDetail(id, scope);
};

// ---- reads ----

const parseOrderFilters = ({ deliveryDate, statuses, brand, tempClass, q }) => ({
    ...(deliveryDate && { deliveryDate: fromYmd(deliveryDate) }),
    ...(statuses && { status: { in: statuses } }),
    ...(brand && { brand }),
    ...(tempClass && { tempClass }),
    ...(q && {
        OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { outlet: { name: { contains: q, mode: "insensitive" } } },
            { outlet: { code: { contains: q, mode: "insensitive" } } },
        ],
    }),
});

export const listOrdersService = async ({ userId, deliveryDate, statuses, brand, tempClass, outletId, q, page, pageSize }) => {
    const scope = await usersService.getScope(userId);
    if (outletId && scope.role === Role.STORE_MANAGER) assertOutletAccess(scope, outletId);

    const where = {
        AND: [scopeWhere(scope), { ...(outletId && { outletId }), ...parseOrderFilters({ deliveryDate, statuses, brand, tempClass, q }) }],
    };

    const { rows, total } = await listOrders({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toOrderListDTO(rows, { page, pageSize, total });
};

const zeroFilled = (values) => Object.fromEntries(values.map((value) => [value, 0]));

export const getOrdersSummaryService = async ({ userId, deliveryDate }) => {
    const scope = await usersService.getScope(userId);
    const where = { AND: [scopeWhere(scope), deliveryDate ? { deliveryDate: fromYmd(deliveryDate) } : {}] };

    const { byStatus, byBrand } = await countOrdersByStatusAndBrand(where);
    const statusCounts = zeroFilled(Object.values(OrderStatus));
    const brandCounts = zeroFilled(Object.values(Brand));
    for (const row of byStatus) statusCounts[row.status] = row._count._all;
    for (const row of byBrand) brandCounts[row.brand] = row._count._all;

    return toOrderCountsDTO({ deliveryDate, byStatus: statusCounts, byBrand: brandCounts });
};

export const getOrderService = async ({ userId, id }) => {
    const scope = await usersService.getScope(userId);
    return getOrderForScope(id, scope);
};

// ---- used by other services ----

// One order in the detail shape; 404 if missing, 403 if outside the scope.
export const getOrderForScope = async (orderId, scope) => {
    const order = await findOrderDetailById(orderId);
    if (!order) throw new AppError("Order not found.", 404);
    assertOrderScope(scope, order);
    return toOrderDetailDTO(order, scope.role, labelFor);
};

// The plain facts the allocation engine needs; pass a transaction to read inside it.
export const getOrderForAllocation = async (orderId, tx) => {
    const order = await findOrderForPlanning(orderId, tx);
    if (!order) throw new AppError("Order not found.", 404);
    return toOrderPlanningDTO(order);
};

// The facts issues, receipts and deliveries need about an order: outlet, depot, status, lines, the stop
// and trip it is allocated to, and its receipt. 404 when missing; pass a transaction to read inside it.
export const getOrderRef = async (orderId, tx) => {
    const order = await findOrderRef(orderId, tx);
    if (!order) throw new AppError("Order not found.", 404);
    return toOrderRefDTO(order);
};

// Moves an order to another delivery date (deferral, replan). Does not touch the status.
export const setOrderDeliveryDateTx = async (tx, orderId, { deliveryDate, rolledOver, cutoffAt }) => {
    await updateOrderFieldsTx(tx, orderId, {
        deliveryDate: fromYmd(deliveryDate),
        rolledOver,
        ...(cutoffAt !== undefined && { cutoffAt }),
    });
};

// Orders of a depot and date waiting for planning, with their outlet, allocation and same-outlet siblings.
export const listPlanningQueue = async ({ depotId, deliveryDate, statuses, brand, tempClass, q }, tx) => {
    const queueStatuses = statuses ?? [OrderStatus.CONFIRMED, OrderStatus.DEFERRED, OrderStatus.PLANNED];
    const where = {
        depotId,
        deliveryDate: fromYmd(deliveryDate),
        status: { in: queueStatuses },
        ...(brand && { brand }),
        ...(tempClass && { tempClass }),
        ...(q && {
            OR: [
                { reference: { contains: q, mode: "insensitive" } },
                { outlet: { name: { contains: q, mode: "insensitive" } } },
                { outlet: { code: { contains: q, mode: "insensitive" } } },
            ],
        }),
    };

    // one after the other: inside a transaction there is a single connection, which runs one query at a time
    const orders = await listQueueOrders(where, tx);
    const sameDay = await listOrdersOfDepotDate(
        {
            depotId,
            deliveryDate: fromYmd(deliveryDate),
            statuses: [OrderStatus.PENDING_REVIEW, OrderStatus.CONFIRMED, OrderStatus.DEFERRED, OrderStatus.PLANNED],
        },
        tx,
    );

    return orders.map((order) =>
        toQueueOrderDTO(order, sameDay.filter((other) => other.outletId === order.outlet.id && other.id !== order.id)),
    );
};

// Order counts by status for a depot and date (every status present, zero-filled).
export const countOrdersForDepotDate = async ({ depotId, deliveryDate }, tx) => {
    const rows = await countOrdersByStatus({ depotId, deliveryDate: fromYmd(deliveryDate) }, tx);
    const counts = zeroFilled(Object.values(OrderStatus));
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
};
