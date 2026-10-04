// Defines Data Transfer Objects to format dispatch plans, sequenced trips, stops, and allocations for clients.
import { formatDate } from "../orders/orders.adapters.js";

const num = (value) => (value === null || value === undefined ? null : Number(value));
const PUBLISHED_OR_LATER = ["PUBLISHED", "IN_EXECUTION", "COMPLETED"];

// byStatus is { CONFIRMED: 4, PLANNED: 2, ... } for the plan's depot-day.
export const toCountsDTO = (byStatus = {}) => {
	const get = (status) => byStatus[status] ?? 0;
	return {
		byStatus,
		pendingReview: get("PENDING_REVIEW"),
		unplanned: get("CONFIRMED"),
		deferred: get("DEFERRED"),
		planned: get("PLANNED"),
		partial: get("PARTIALLY_LOADED"),
		inProgress: get("LOADED") + get("IN_TRANSIT"),
		delivered: get("DELIVERED") + get("PARTIALLY_DELIVERED") + get("RECEIVED") + get("RECEIVED_WITH_ISSUES"),
		toPlan: get("CONFIRMED") + get("DEFERRED"),
	};
};

export const toPlanDTO = (plan, byStatus, extra = {}) => ({
	id: plan.id,
	depot: { id: plan.depot.id, code: plan.depot.code, name: plan.depot.name },
	depotId: plan.depotId,
	deliveryDate: formatDate(plan.deliveryDate),
	status: plan.status,
	closedAt: plan.closedAt,
	closedById: plan.closedById,
	publishedAt: plan.publishedAt,
	publishedById: plan.publishedById,
	version: plan.version,
	canAllocate: ["CLOSED", "DRAFT"].includes(plan.status),
	canPublish: ["CLOSED", "DRAFT"].includes(plan.status),
	locked: PUBLISHED_OR_LATER.includes(plan.status),
	counts: toCountsDTO(byStatus),
	...extra,
});

export const toTripDTO = (trip) => {
	const maxWeight = num(trip.vehicle.maxWeightKg);
	const maxVolume = num(trip.vehicle.maxVolumeM3);
	return {
		id: trip.id,
		code: trip.code,
		tripNumber: trip.tripNumber,
		status: trip.status,
		vehicle: {
			id: trip.vehicle.id, code: trip.vehicle.code, type: trip.vehicle.type, isRefrigerated: trip.vehicle.isRefrigerated,
			maxWeightKg: maxWeight, maxVolumeM3: maxVolume,
		},
		driver: trip.driver ? { id: trip.driver.id, fullName: trip.driver.fullName, employeeNumber: trip.driver.employeeNumber } : null,
		plannedWeightKg: num(trip.plannedWeightKg),
		plannedVolumeM3: num(trip.plannedVolumeM3),
		plannedDistanceKm: num(trip.plannedDistanceKm),
		plannedFuelL: num(trip.plannedFuelL),
		plannedDeparture: trip.plannedDeparture,
		plannedReturn: trip.plannedReturn,
		weightRatio: maxWeight ? Math.round((num(trip.plannedWeightKg) / maxWeight) * 100) / 100 : null,
		volumeRatio: maxVolume ? Math.round((num(trip.plannedVolumeM3) / maxVolume) * 100) / 100 : null,
		stops: trip.stops.map((stop) => ({
			id: stop.id,
			sequence: stop.sequence,
			status: stop.status,
			outlet: { id: stop.outlet.id, code: stop.outlet.code, name: stop.outlet.name, district: stop.outlet.district },
			plannedArrival: stop.plannedArrival,
			legDistanceKm: num(stop.legDistanceKm),
			orders: stop.allocations.map((allocation) => ({
				id: allocation.order.id,
				reference: allocation.order.reference,
				brand: allocation.order.brand,
				tempClass: allocation.order.tempClass,
				status: allocation.order.status,
				weightKg: num(allocation.order.totalWeightKg),
				volumeM3: num(allocation.order.totalVolumeM3),
				warningsAcknowledged: allocation.warningsAcknowledged ?? [],
			})),
		})),
	};
};

export const toQueueItemDTO = (order, siblingCount = 1) => {
	const trip = order.allocation?.stop?.trip;
	return {
		id: order.id,
		reference: order.reference,
		status: order.status,
		brand: order.brand,
		tempClass: order.tempClass,
		deliveryDate: formatDate(order.deliveryDate),
		outlet: { id: order.outlet.id, code: order.outlet.code, name: order.outlet.name, district: order.outlet.district },
		weightKg: num(order.totalWeightKg),
		volumeM3: num(order.totalVolumeM3),
		itemCount: order.itemCount,
		windowStartMin: order.windowStartMin,
		windowEndMin: order.windowEndMin,
		vanOnly: order.vanOnly ?? false,
		isFragile: order.isFragile,
		isHighValue: order.isHighValue,
		rolledOver: order.rolledOver,
		siblingOrders: Math.max(0, siblingCount - 1), // other plannable orders for the same outlet that day
		deferral: order.deferrals?.[0] ? { reason: order.deferrals[0].reason, consecutiveCount: order.deferrals[0].consecutiveCount } : null,
		allocation: trip ? { tripId: trip.id, tripCode: trip.code, tripNumber: trip.tripNumber, vehicleCode: trip.vehicle.code, stopSequence: order.allocation.stop.sequence } : null,
	};
};
