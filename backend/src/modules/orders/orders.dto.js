const decimalToNumber = (value) => (value === null || value === undefined ? value : Number(value));
const dateOnly = (value) => value?.toISOString?.().slice(0, 10) ?? value;

export const toOrderListDTO = (order) => ({
	id: order.id,
	reference: order.reference,
	outletId: order.outletId,
	outletName: order.outlet?.name ?? order.Outlet?.name ?? order.outletId,
	city: order.outlet?.district ?? order.Outlet?.district ?? null,
	destination: order.outlet?.district ?? order.outlet?.name ?? "Colombo",
	depotId: order.depotId,
	depotName: order.depot?.name ?? order.Depot?.name ?? order.depotId,
	brand: order.brand,
	tempClass: order.tempClass,
	requestedDeliveryDate: dateOnly(order.requestedDeliveryDate),
	deliveryDate: dateOnly(order.deliveryDate),
	rolledOver: order.rolledOver,
	status: order.status,
	itemCount: order.itemCount,
	totalWeightKg: decimalToNumber(order.totalWeightKg),
	totalVolumeM3: decimalToNumber(order.totalVolumeM3),
	window: order.windowStartMin === null || order.windowStartMin === undefined
		? null
		: { startMin: order.windowStartMin, endMin: order.windowEndMin },
	snapshot: {
		vanOnly: order.vanOnly,
		isMall: order.isMall,
		unloadingType: order.unloadingType,
	},
	items: (order.items ?? []).map((item) => ({
		id: item.id,
		lineNo: item.lineNo,
		itemName: item.itemName,
		sku: item.sku,
		unit: item.unit,
		quantity: item.quantity,
		weightKg: decimalToNumber(item.weightKg),
		volumeM3: decimalToNumber(item.volumeM3),
		notes: item.notes,
	})),
	driver: (order.allocation?.stop?.trip?.driver ?? order.Allocation?.Stop?.Trip?.User)
		? {
			id: (order.allocation?.stop?.trip?.driver ?? order.Allocation?.Stop?.Trip?.User).id,
			name: (order.allocation?.stop?.trip?.driver ?? order.Allocation?.Stop?.Trip?.User).fullName,
			phone: (order.allocation?.stop?.trip?.driver ?? order.Allocation?.Stop?.Trip?.User).phone,
			employeeNumber: (order.allocation?.stop?.trip?.driver ?? order.Allocation?.Stop?.Trip?.User).employeeNumber,
		}
		: null,
	tripCode: order.allocation?.stop?.trip?.code ?? order.Allocation?.Stop?.Trip?.code ?? null,
	createdAt: order.createdAt,
	submittedAt: order.submittedAt,
	confirmedAt: order.confirmedAt,
});

export const toOrderDetailDTO = (order) => ({
	...toOrderListDTO(order),
	specialInstructions: order.specialInstructions,
	isFragile: order.isFragile,
	isHighValue: order.isHighValue,
	cutoffAt: order.cutoffAt,
	cancelledAt: order.cancelledAt,
	createdById: order.createdById,
	version: order.version,
	timeline: (order.events ?? []).map((event) => ({
		id: event.id,
		fromStatus: event.fromStatus,
		toStatus: event.toStatus,
		actorId: event.actorId,
		reason: event.reason,
		data: event.data,
		occurredAt: event.occurredAt,
	})),
});

export const toOrderSummaryDTO = (groups) => ({
	byStatus: groups.byStatus,
	byBrand: groups.byBrand,
	byTab: {
		pendingReview: (groups.byStatus.DRAFT ?? 0) + (groups.byStatus.PENDING_REVIEW ?? 0),
		confirmed: (groups.byStatus.CONFIRMED ?? 0) + (groups.byStatus.DEFERRED ?? 0),
		planned: (groups.byStatus.PLANNED ?? 0) + (groups.byStatus.LOADED ?? 0) + (groups.byStatus.PARTIALLY_LOADED ?? 0),
		inTransit: groups.byStatus.IN_TRANSIT ?? 0,
		delivered: ["DELIVERED", "PARTIALLY_DELIVERED", "RECEIVED", "RECEIVED_WITH_ISSUES", "FAILED"]
			.reduce((total, key) => total + (groups.byStatus[key] ?? 0), 0),
	},
});