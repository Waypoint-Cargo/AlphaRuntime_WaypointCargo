import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
import { toOrderDetailDTO, toOrderListDTO, toOrderSummaryDTO } from "./orders.dto.js";
import { createOrderEventsTx, createOrderTx, findOrderById, findOrderByIdTx, findOrderStatusesTx, listDepotStock, listOrders, releaseStockTx, reserveStockTx, summarizeOrders, updateOrderStatusIfTx, updateOrderSubmissionTx, updateOrderTx } from "./orders.repository.js";
import { evaluateOrderChecks, evaluateStockCheck, getOrderContext, getScope, resolveDeliveryDate } from "./orders.adapters.js";

// Aggregate order demand per stock row (SKU first, then item name) -> [{ id, qty }].
const stockDemand = (order, stockRows) => {
	const demand = new Map();
	for (const item of order.items ?? []) {
		const row = stockRows.find((r) => item.sku && r.sku.toLowerCase() === item.sku.toLowerCase()) ?? stockRows.find((r) => r.itemName.toLowerCase() === item.itemName.toLowerCase());
		if (row) demand.set(row.id, (demand.get(row.id) ?? 0) + item.quantity);
	}
	return [...demand].map(([id, qty]) => ({ id, qty }));
};

const TRANSITIONS = {
	DRAFT: ["PENDING_REVIEW", "CANCELLED"],
	PENDING_REVIEW: ["CONFIRMED", "CANCELLED", "DEFERRED"],
	CONFIRMED: ["PLANNED", "DEFERRED", "CANCELLED"],
	DEFERRED: ["CONFIRMED", "PLANNED", "CANCELLED"],
	PLANNED: ["LOADED", "PARTIALLY_LOADED", "CONFIRMED", "DEFERRED"],
	LOADED: ["IN_TRANSIT"],
	PARTIALLY_LOADED: ["IN_TRANSIT"],
	IN_TRANSIT: ["DELIVERED", "PARTIALLY_DELIVERED", "FAILED"],
	DELIVERED: ["RECEIVED", "RECEIVED_WITH_ISSUES"],
	PARTIALLY_DELIVERED: ["RECEIVED", "RECEIVED_WITH_ISSUES"],
};

const totalsFor = (items) => items.reduce((totals, item) => ({
	itemCount: totals.itemCount + item.quantity,
	totalWeightKg: totals.totalWeightKg + item.weightKg,
	totalVolumeM3: totals.totalVolumeM3 + item.volumeM3,
}), { itemCount: 0, totalWeightKg: 0, totalVolumeM3: 0 });
const itemData = (items) => items.map(({ itemName, sku, unit, quantity, weightKg, volumeM3, notes }, index) => ({
	lineNo: index + 1,
	itemName,
	sku,
	unit,
	quantity,
	weightKg,
	volumeM3,
	notes,
}));
const dateValue = (date) => new Date(`${date}T00:00:00.000Z`);

export const transitionOrdersTx = async (tx, { orderIds, toStatus, actorId, reason = null, data = null }) => {
	const orders = await findOrderStatusesTx(tx, orderIds);
	if (orders.length !== orderIds.length) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	for (const order of orders) {
		if (!TRANSITIONS[order.status]?.includes(toStatus)) throw new AppError(`Order cannot move from ${order.status} to ${toStatus}.`, 409, { code: "INVALID_STATUS_TRANSITION", orderId: order.id, current: order.status, requested: toStatus });
		const changed = await updateOrderStatusIfTx(tx, order.id, order.status, toStatus, order.version);
		if (changed === 0) throw new AppError("The order changed while you were working on it.", 409, { code: "VERSION_CONFLICT", orderId: order.id });
	}
	await createOrderEventsTx(tx, orders.map((order) => ({ orderId: order.id, fromStatus: order.status, toStatus, actorId, reason, data })));
};

export const createOrder = async ({ actor, input }) => {
	const context = await getOrderContext(actor);
	const totals = totalsFor(input.items);
	const deliveryDate = dateValue(input.requestedDeliveryDate);
	const order = await getPrisma().$transaction(async (tx) => {
		const created = await createOrderTx(tx, {
			reference: `ORD-${Date.now().toString().slice(-8)}`,
			outletId: context.outletId, depotId: context.depotId, brand: context.brand, tempClass: input.tempClass,
			requestedDeliveryDate: deliveryDate, deliveryDate, status: "DRAFT", ...totals,
			specialInstructions: input.specialInstructions, isFragile: input.isFragile, isHighValue: input.isHighValue,
			createdById: actor.id, items: itemData(input.items), events: [{ fromStatus: null, toStatus: "DRAFT", actorId: actor.id, reason: "CREATED" }],
		});
		if (!input.submit) return created;
		return submitOrderTx(tx, { actor, order: created, context });
	});
	return toOrderDetailDTO(order);
};

export const listOrderService = async ({ actor, filters }) => {
	const result = await listOrders({ scope: { ...(await getScope(actor)), userId: actor.id }, filters, page: filters.page, pageSize: filters.pageSize });
	return { items: result.items.map(toOrderListDTO), meta: { page: filters.page, pageSize: filters.pageSize, total: result.total, pageCount: Math.ceil(result.total / filters.pageSize) } };
};
export const summaryOrderService = async ({ actor, deliveryDate }) => toOrderSummaryDTO(await summarizeOrders({ scope: { ...(await getScope(actor)), userId: actor.id }, deliveryDate }));

export const getOrderService = async ({ actor, id }) => {
	const order = await findOrderById(id, { ...(await getScope(actor)), userId: actor.id });
	if (!order) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	return toOrderDetailDTO(order);
};

const submitOrderTx = async (tx, { actor, order, context }) => {
	const resolved = resolveDeliveryDate({ requestedDate: order.requestedDeliveryDate.toISOString().slice(0, 10), actor: context });
	await updateOrderSubmissionTx(tx, order.id, { deliveryDate: dateValue(resolved.deliveryDate), rolledOver: resolved.rolledOver, cutoffAt: resolved.cutoffAt, submittedAt: new Date(), ...context.snapshot });
	await transitionOrdersTx(tx, { orderIds: [order.id], toStatus: "PENDING_REVIEW", actorId: actor.id, reason: resolved.rolledOver ? "ROLLED_OVER" : null });
	return findOrderByIdTx(tx, order.id);
};

export const submitOrder = async ({ actor, id }) => {
	const existing = await findOrderById(id, { ...(await getScope(actor)), userId: actor.id });
	if (!existing) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	if (existing.status !== "DRAFT") throw new AppError("Only draft orders can be submitted.", 409, { code: "INVALID_STATUS_TRANSITION" });
	const context = await getOrderContext(actor);
	const order = await getPrisma().$transaction((tx) => submitOrderTx(tx, { actor, order: existing, context }));
	return toOrderDetailDTO(order);
};

export const updateOrderService = async ({ actor, id, input }) => {
	const existing = await findOrderById(id, { ...(await getScope(actor)), userId: actor.id });
	if (!existing) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	if (!["DRAFT", "PENDING_REVIEW"].includes(existing.status)) throw new AppError("This order cannot be edited in its current state.", 409, { code: "ORDER_NOT_EDITABLE" });
	const items = input.items ? itemData(input.items) : undefined;
	const totals = input.items ? totalsFor(input.items) : {};
	const data = { ...totals, ...(input.tempClass ? { tempClass: input.tempClass } : {}), ...(input.requestedDeliveryDate ? { requestedDeliveryDate: dateValue(input.requestedDeliveryDate), ...(existing.status === "DRAFT" ? { deliveryDate: dateValue(input.requestedDeliveryDate) } : {}) } : {}), ...Object.fromEntries(["specialInstructions", "isFragile", "isHighValue"].filter((key) => input[key] !== undefined).map((key) => [key, input[key]])) };
	const order = await getPrisma().$transaction((tx) => updateOrderTx(tx, id, input.version, data, items));
	if (!order) throw new AppError("The order version is stale.", 409, { code: "VERSION_CONFLICT" });
	return toOrderDetailDTO(order);
};

export const checksOrderService = async ({ actor, id }) => {
	const order = await findOrderById(id, { ...(await getScope(actor)), userId: actor.id });
	if (!order) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	const context = await getOrderContext(actor);
	const stock = evaluateStockCheck(order, await listDepotStock(order.depotId));
	return { orderId: id, ...evaluateOrderChecks(order, context, new Date(), [stock]) };
};

export const confirmOrder = async ({ actor, id }) => {
	const existing = await findOrderById(id, { ...(await getScope(actor)), userId: actor.id });
	if (!existing) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	if (existing.status !== "PENDING_REVIEW") throw new AppError("Only orders pending review can be confirmed.", 409, { code: "INVALID_STATUS_TRANSITION" });
	const context = await getOrderContext(actor);
	const stockRows = await listDepotStock(existing.depotId);
	const checks = evaluateOrderChecks(existing, context, new Date(), [evaluateStockCheck(existing, stockRows)]);
	if (checks.verdict === "FAIL") throw new AppError("Order fulfillment checks failed.", 422, { code: "ORDER_CHECKS_FAILED", checks: checks.checks });
	const order = await getPrisma().$transaction(async (tx) => {
		const current = await findOrderByIdTx(tx, id);
		const resolved = resolveDeliveryDate({ requestedDate: current.deliveryDate.toISOString().slice(0, 10), actor: context });
		if (resolved.rolledOver) await updateOrderSubmissionTx(tx, id, { deliveryDate: dateValue(resolved.deliveryDate), rolledOver: true, cutoffAt: resolved.cutoffAt });
		if (!(await reserveStockTx(tx, stockDemand(existing, stockRows)))) throw new AppError("Not enough stock to confirm this order.", 409, { code: "INSUFFICIENT_STOCK" });
		await updateOrderSubmissionTx(tx, id, { confirmedAt: new Date() });
		await transitionOrdersTx(tx, { orderIds: [id], toStatus: "CONFIRMED", actorId: actor.id, reason: resolved.rolledOver ? "ROLLED_OVER" : null });
		return findOrderByIdTx(tx, id);
	});
	return { ...toOrderDetailDTO(order), checks, rolledOver: order.rolledOver, message: "Order confirmed and is ready for dispatcher planning." };
};

export const cancelOrder = async ({ actor, id, reason }) => {
	const existing = await findOrderById(id, { ...(await getScope(actor)), userId: actor.id });
	if (!existing) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	if (!["DRAFT", "PENDING_REVIEW", "CONFIRMED", "DEFERRED"].includes(existing.status)) throw new AppError("This order cannot be cancelled.", 409, { code: "INVALID_STATUS_TRANSITION" });
	const order = await getPrisma().$transaction(async (tx) => {
		await updateOrderSubmissionTx(tx, id, { cancelledAt: new Date() });
		// Confirmed orders hold a stock reservation; give it back.
		if (existing.status === "CONFIRMED") await releaseStockTx(tx, stockDemand(existing, await listDepotStock(existing.depotId, tx)));
		await transitionOrdersTx(tx, { orderIds: [id], toStatus: "CANCELLED", actorId: actor.id, reason });
		return findOrderByIdTx(tx, id);
	});
	return toOrderDetailDTO(order);
};

export const deferOrder = async ({ actor, id, reason }) => {
	const existing = await findOrderById(id, { ...(await getScope(actor)), userId: actor.id });
	if (!existing) throw new AppError("Order not found.", 404, { code: "NOT_FOUND" });
	const order = await getPrisma().$transaction(async (tx) => {
		await transitionOrdersTx(tx, { orderIds: [id], toStatus: "DEFERRED", actorId: actor.id, reason: reason ?? "DEFERRED_ADAPTER" });
		return findOrderByIdTx(tx, id);
	});
	return toOrderDetailDTO(order);
};

export { TRANSITIONS };