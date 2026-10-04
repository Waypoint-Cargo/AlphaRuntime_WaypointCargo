// Manages database persistence for DispatchPlan, Trip, Stop, and Allocation entities via Prisma.
import { getPrisma } from "../../config/database.js";

const depotSelect = { id: true, code: true, name: true, lat: true, lng: true };
const planInclude = { depot: { select: depotSelect } };

const outletBrief = { select: { id: true, code: true, name: true, district: true, lat: true, lng: true } };

export const tripInclude = {
	vehicle: { select: { id: true, code: true, type: true, isRefrigerated: true, maxWeightKg: true, maxVolumeM3: true, fuelKmPerLitre: true, weeklyFuelQuotaL: true, homeDepotId: true } },
	driver: { select: { id: true, fullName: true, phone: true, employeeNumber: true } },
	stops: {
		orderBy: { sequence: "asc" },
		include: {
			outlet: outletBrief,
			allocations: {
				include: {
					order: { select: { id: true, reference: true, brand: true, tempClass: true, status: true, totalWeightKg: true, totalVolumeM3: true, itemCount: true, items: { select: { id: true, quantity: true } } } },
				},
			},
		},
	},
};

export const findPlanById = (client, id) => client.dispatchPlan.findUnique({ where: { id }, include: planInclude });

export const findPlanByDepotDate = (client, depotId, deliveryDate) =>
	client.dispatchPlan.findUnique({ where: { depotId_deliveryDate: { depotId, deliveryDate } }, include: planInclude });

export const listPlans = (client, { depotIds, depotId, deliveryDate, status }) =>
	client.dispatchPlan.findMany({
		where: {
			...(depotId ? { depotId } : depotIds ? { depotId: { in: depotIds } } : {}),
			...(deliveryDate ? { deliveryDate } : {}),
			...(status ? { status } : {}),
		},
		include: planInclude,
		orderBy: [{ deliveryDate: "desc" }, { createdAt: "desc" }],
		take: 100,
	});

export const createPlanTx = (tx, data) => tx.dispatchPlan.create({ data, include: planInclude });

// Every write bumps `version` so concurrent readers can detect that the plan moved on.
export const updatePlanTx = (tx, id, data) =>
	tx.dispatchPlan.update({ where: { id }, data: { ...data, version: { increment: 1 } }, include: planInclude });

// Row lock: serialises every allocation / un-allocation / publish of the same plan (and therefore of that depot-day).
export const lockPlanTx = (tx, id) => tx.$queryRaw`SELECT "id" FROM "DispatchPlan" WHERE "id" = ${id} FOR UPDATE`;

export const countOrdersByStatus = async (client, depotId, deliveryDate) => {
	const rows = await client.order.groupBy({ by: ["status"], where: { depotId, deliveryDate }, _count: { _all: true } });
	return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
};

export const listOrdersByStatusesTx = (client, depotId, deliveryDate, statuses) =>
	client.order.findMany({
		where: { depotId, deliveryDate, status: { in: statuses } },
		select: { id: true, reference: true, outletId: true, status: true, version: true },
		orderBy: { reference: "asc" },
	});

export const listTripsForPlan = (client, planId) =>
	client.trip.findMany({ where: { planId, status: { not: "CANCELLED" } }, include: tripInclude, orderBy: [{ code: "asc" }] });

const QUEUE_SORT = {
	suggested: [{ windowEndMin: { sort: "asc", nulls: "last" } }, { totalWeightKg: "desc" }, { reference: "asc" }],
	windowEnd: [{ windowEndMin: { sort: "asc", nulls: "last" } }, { reference: "asc" }],
	weight: [{ totalWeightKg: "desc" }, { reference: "asc" }],
	reference: [{ reference: "asc" }],
};

export const QUEUE_FILTERS = {
	unplanned: ["CONFIRMED", "DEFERRED"],
	partial: ["PARTIALLY_LOADED"],
	planned: ["PLANNED"],
	all: ["CONFIRMED", "DEFERRED", "PLANNED", "PARTIALLY_LOADED"],
};

export const fetchQueue = async (client, { depotId, deliveryDate, filter, brand, tempClass, q, sort, page, pageSize }) => {
	const where = {
		depotId,
		deliveryDate,
		status: { in: QUEUE_FILTERS[filter] },
		...(brand ? { brand } : {}),
		...(tempClass ? { tempClass } : {}),
		...(q ? {
			OR: [
				{ reference: { contains: q, mode: "insensitive" } },
				{ outlet: { name: { contains: q, mode: "insensitive" } } },
				{ outlet: { code: { contains: q, mode: "insensitive" } } },
				{ outlet: { district: { contains: q, mode: "insensitive" } } },
			],
		} : {}),
	};
	const [items, total] = await Promise.all([
		client.order.findMany({
			where,
			orderBy: QUEUE_SORT[sort] ?? QUEUE_SORT.suggested,
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				outlet: outletBrief,
				deferrals: { where: { status: { in: ["PENDING_DECISION", "DEFERRED"] } }, orderBy: { createdAt: "desc" }, take: 1, select: { reason: true, consecutiveCount: true, status: true } },
				allocation: { include: { stop: { select: { sequence: true, trip: { select: { id: true, code: true, tripNumber: true, vehicle: { select: { id: true, code: true } } } } } } } },
			},
		}),
		client.order.count({ where }),
	]);
	return { items, total };
};

// How many other plannable orders the same outlet has that day (siblings can share one stop).
export const countOutletSiblings = async (client, depotId, deliveryDate, outletIds) => {
	if (!outletIds.length) return new Map();
	const rows = await client.order.groupBy({
		by: ["outletId"],
		where: { depotId, deliveryDate, outletId: { in: outletIds }, status: { in: QUEUE_FILTERS.all } },
		_count: { _all: true },
	});
	return new Map(rows.map((row) => [row.outletId, row._count._all]));
};

export const getPlanDb = () => getPrisma();
