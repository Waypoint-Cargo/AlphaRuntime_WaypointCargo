import { getPrisma } from "../../config/database.js";

const orderInclude = {
	outlet: { select: { id: true, name: true, code: true, district: true, brand: true, depot: { select: { id: true, name: true, code: true } } } },
	depot: { select: { id: true, name: true, code: true } },
	items: { orderBy: { lineNo: "asc" } },
	events: { orderBy: { occurredAt: "asc" } },
	allocation: { include: { stop: { include: { trip: { select: { code: true, driver: { select: { id: true, fullName: true, phone: true, employeeNumber: true } } } } } } } },
};

const scopeWhere = (scope = {}) => {
	if (scope.all) return {};
	if (scope.role === "STORE_MANAGER") return { outletId: scope.outletId };
	if (scope.role === "DISPATCHER") return { depotId: { in: scope.depotIds ?? [] } };
	return { createdById: scope.userId };
};

export const createOrderTx = (tx, data) => tx.order.create({
	data: {
		...data,
		items: { create: data.items },
		events: { create: data.events },
	},
	include: orderInclude,
});

export const findOrderById = (id, scope) => getPrisma().order.findFirst({ where: { id, ...scopeWhere(scope) }, include: orderInclude });
export const findOrderByIdTx = (tx, id) => tx.order.findUnique({ where: { id }, include: orderInclude });

export const listOrders = async ({ scope, filters, page, pageSize }) => {
	const where = {
		...scopeWhere(scope),
		...(filters.deliveryDate ? { deliveryDate: new Date(`${filters.deliveryDate}T00:00:00.000Z`) } : {}),
		...(filters.status?.length ? { status: { in: filters.status } } : {}),
		...(filters.brand ? { brand: filters.brand } : {}),
		...(filters.tempClass ? { tempClass: filters.tempClass } : {}),
		...(filters.outletId ? { outletId: filters.outletId } : {}),
		...(filters.depotId ? { depotId: filters.depotId } : {}),
		...(filters.q ? { OR: [{ reference: { contains: filters.q, mode: "insensitive" } }, { outletId: { contains: filters.q, mode: "insensitive" } }] } : {}),
	};
	const orderBy = filters.sort === "deliveryDate" ? { deliveryDate: "asc" } : filters.sort === "-deliveryDate" ? { deliveryDate: "desc" } : { createdAt: "desc" };
	const db = getPrisma();
	const [items, total] = await Promise.all([
		db.order.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: orderInclude }),
		db.order.count({ where }),
	]);
	return { items, total };
};

export const summarizeOrders = async ({ scope, deliveryDate }) => {
	const where = { ...scopeWhere(scope), ...(deliveryDate ? { deliveryDate: new Date(`${deliveryDate}T00:00:00.000Z`) } : {}) };
	const orders = await getPrisma().order.findMany({ where, select: { status: true, brand: true } });
	return orders.reduce((groups, order) => {
		groups.byStatus[order.status] = (groups.byStatus[order.status] ?? 0) + 1;
		groups.byBrand[order.brand] = (groups.byBrand[order.brand] ?? 0) + 1;
		return groups;
	}, { byStatus: {}, byBrand: {} });
};

export const updateOrderTx = async (tx, id, version, data, items) => {
	const changed = await tx.order.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
	if (changed.count === 0) return null;
	if (items) {
		await tx.orderItem.deleteMany({ where: { orderId: id } });
		await tx.orderItem.createMany({ data: items.map((item, index) => ({ ...item, orderId: id, lineNo: index + 1 })) });
	}
	return tx.order.findUnique({ where: { id }, include: orderInclude });
};

export const updateOrderSubmissionTx = (tx, id, data) => tx.order.update({ where: { id }, data });
export const findOrderStatusesTx = (tx, orderIds) => tx.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, status: true, version: true } });
export const updateOrderStatusIfTx = async (tx, id, status, toStatus, version) => {
	const result = await tx.order.updateMany({ where: { id, status, version }, data: { status: toStatus, version: { increment: 1 } } });
	return result.count;
};
export const createOrderEventsTx = (tx, events) => tx.orderEvent.createMany({ data: events });

export const listDepotStock = (depotId, client = getPrisma()) => client.stock.findMany({ where: { depotId } });

// lines: [{ id: stockRowId, qty }]. Fails (0 rows) when on-hand minus reserved is insufficient.
export const reserveStockTx = async (tx, lines) => {
	for (const { id, qty } of lines) {
		const changed = await tx.$executeRaw`UPDATE "Stock" SET "reservedQty" = "reservedQty" + ${qty}, "updatedAt" = NOW() WHERE "id" = ${id} AND "quantityOnHand" - "reservedQty" >= ${qty}`;
		if (changed === 0) return false;
	}
	return true;
};
export const releaseStockTx = async (tx, lines) => {
	for (const { id, qty } of lines) {
		await tx.$executeRaw`UPDATE "Stock" SET "reservedQty" = GREATEST("reservedQty" - ${qty}, 0), "updatedAt" = NOW() WHERE "id" = ${id}`;
	}
};

export { scopeWhere };
