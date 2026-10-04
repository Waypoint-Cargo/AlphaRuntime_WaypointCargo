// Persistence for allocations and the trips/stops they create. Every write takes a transaction client; callers hold
// the plan row lock (planning.repository lockPlanTx) before using them.

const outletRoute = { select: { id: true, code: true, name: true, lat: true, lng: true, vanOnly: true } };

export const orderForAllocationInclude = {
	outlet: { select: { id: true, code: true, name: true, district: true, lat: true, lng: true, vanOnly: true, windowStartMin: true, windowEndMin: true } },
	depot: { select: { id: true, code: true, name: true, lat: true, lng: true } },
	allocation: { include: { stop: { include: { trip: { select: { id: true, code: true, tripNumber: true, status: true, planId: true, vehicleId: true } } } } } },
};

export const findOrderForAllocation = (client, orderId) =>
	client.order.findUnique({ where: { id: orderId }, include: orderForAllocationInclude });

const vehicleSelect = {
	id: true, code: true, type: true, isRefrigerated: true, maxWeightKg: true, maxVolumeM3: true, fuelKmPerLitre: true,
	weeklyFuelQuotaL: true, status: true, isActive: true, homeDepotId: true, defaultDriverId: true,
	defaultDriver: { select: { id: true, fullName: true, employeeNumber: true } },
};

export const findVehicle = (client, vehicleId) => client.vehicle.findUnique({ where: { id: vehicleId }, select: vehicleSelect });

export const listActiveDepotVehicles = (client, depotId) =>
	client.vehicle.findMany({ where: { homeDepotId: depotId, isActive: true }, select: vehicleSelect, orderBy: { code: "asc" } });

const tripWithLoad = {
	stops: {
		orderBy: { sequence: "asc" },
		include: { outlet: outletRoute, allocations: { include: { order: { select: { id: true, totalWeightKg: true, totalVolumeM3: true } } } } },
	},
};

export const findTripsForVehiclesOnDate = (client, vehicleIds, deliveryDate) =>
	client.trip.findMany({ where: { vehicleId: { in: vehicleIds }, deliveryDate, status: { not: "CANCELLED" } }, include: tripWithLoad });

export const findTrip = (client, vehicleId, deliveryDate, tripNumber) =>
	client.trip.findUnique({ where: { vehicleId_deliveryDate_tripNumber: { vehicleId, deliveryDate, tripNumber } }, include: tripWithLoad });

export const findTripFull = (client, tripId) =>
	client.trip.findUnique({
		where: { id: tripId },
		include: {
			vehicle: { select: { id: true, fuelKmPerLitre: true } },
			plan: { select: { id: true, status: true, depot: { select: { id: true, lat: true, lng: true } } } },
			...tripWithLoad,
		},
	});

// trip codes come from the DB sequence created in the business-constraints migration: R-001, R-002 ...
export const nextTripCode = async (tx) => {
	const [{ n }] = await tx.$queryRaw`SELECT nextval('trip_code_seq') AS n`;
	return `R-${String(Number(n)).padStart(3, "0")}`;
};

export const createTrip = (tx, data) => tx.trip.create({ data: { ...data, status: "PLANNED" }, include: tripWithLoad });

// a cancelled trip still owns its (vehicle, date, tripNumber) slot, so it is revived rather than duplicated
export const reviveTrip = (tx, tripId, data) => tx.trip.update({ where: { id: tripId }, data: { ...data, status: "PLANNED" }, include: tripWithLoad });

export const updateTrip = (tx, tripId, data) => tx.trip.update({ where: { id: tripId }, data });

export const deleteTrip = (tx, tripId) => tx.trip.delete({ where: { id: tripId } });

// Opens a gap at `position` (1-based) by moving later stops up. Two passes through a high offset keep the
// unique (tripId, sequence) index satisfied at every step.
export const shiftStopsFrom = async (tx, tripId, position) => {
	await tx.stop.updateMany({ where: { tripId, sequence: { gte: position } }, data: { sequence: { increment: 1000 } } });
	await tx.stop.updateMany({ where: { tripId, sequence: { gte: 1000 } }, data: { sequence: { decrement: 999 } } });
};

export const createStop = (tx, { tripId, outletId, sequence }) => tx.stop.create({ data: { tripId, outletId, sequence } });

export const deleteStop = (tx, stopId) => tx.stop.delete({ where: { id: stopId } });

// Re-packs sequences to 1..n after a stop is removed (two passes for the same unique-index reason).
export const resequenceStops = async (tx, tripId) => {
	const stops = await tx.stop.findMany({ where: { tripId }, orderBy: { sequence: "asc" }, select: { id: true, sequence: true } });
	if (stops.every((stop, index) => stop.sequence === index + 1)) return;
	for (const [index, stop] of stops.entries()) await tx.stop.update({ where: { id: stop.id }, data: { sequence: 1000 + index } });
	for (const [index, stop] of stops.entries()) await tx.stop.update({ where: { id: stop.id }, data: { sequence: index + 1 } });
};

export const countStopAllocations = (tx, stopId) => tx.allocation.count({ where: { stopId } });
export const countTripStops = (tx, tripId) => tx.stop.count({ where: { tripId } });

export const createAllocation = (tx, data) => tx.allocation.create({ data });
export const deleteAllocation = (tx, orderId) => tx.allocation.delete({ where: { orderId } });

export const updateStopRoute = (tx, stopId, data) => tx.stop.update({ where: { id: stopId }, data });

// Fuel the vehicle has already committed in a week:
//   published/in-flight fuel from the vehicle_week_fuel view (PLANNED of published plans, ACTUAL, ADJUSTMENT)
//   + planned fuel of that vehicle's trips whose plan is not published yet (OPEN/CLOSED/DRAFT)
// Returns Map(vehicleId -> { viewUsedL, unpublished: Map(tripId -> litres) }).
export const loadFuelPosition = async (client, vehicleIds, weekStart) => {
	const position = new Map(vehicleIds.map((id) => [id, { viewUsedL: 0, unpublished: new Map() }]));
	if (!vehicleIds.length) return position;

	const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
	const weekEndDate = new Date(weekStartDate);
	weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

	const used = await client.$queryRaw`SELECT "vehicleId", "usedL" FROM vehicle_week_fuel WHERE "vehicleId" = ANY(${vehicleIds}::text[]) AND "weekStart" = ${weekStart}::date`;
	for (const row of used) position.get(row.vehicleId).viewUsedL = Number(row.usedL);

	const trips = await client.trip.findMany({
		where: {
			vehicleId: { in: vehicleIds },
			deliveryDate: { gte: weekStartDate, lte: weekEndDate },
			status: { not: "CANCELLED" },
			plan: { status: { in: ["OPEN", "CLOSED", "DRAFT"] } },
		},
		select: { id: true, vehicleId: true, plannedFuelL: true },
	});
	for (const trip of trips) position.get(trip.vehicleId).unpublished.set(trip.id, Number(trip.plannedFuelL));
	return position;
};
