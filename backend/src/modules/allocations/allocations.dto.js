// Shapes allocation results for clients. Decimals become numbers; dates become ISO strings or YYYY-MM-DD.

const num = (value) => (value === null || value === undefined ? null : Number(value));

export const toVehicleBriefDTO = (vehicle) => ({
	id: vehicle.id,
	code: vehicle.code,
	type: vehicle.type,
	isRefrigerated: vehicle.isRefrigerated,
	maxWeightKg: num(vehicle.maxWeightKg),
	maxVolumeM3: num(vehicle.maxVolumeM3),
	status: vehicle.status,
	driver: vehicle.defaultDriver ? { id: vehicle.defaultDriver.id, fullName: vehicle.defaultDriver.fullName, employeeNumber: vehicle.defaultDriver.employeeNumber } : null,
});

export const toEvaluationDTO = (evaluation) => ({
	verdict: evaluation.verdict,
	checks: evaluation.checks,
	blockers: evaluation.blockers,
	warnings: evaluation.warnings,
	projected: evaluation.projected,
});

const toFuelDTO = (option, vehicle) => ({
	measurable: option.projection.fuelMeasurable,
	quotaL: num(vehicle.weeklyFuelQuotaL),
	committedL: option.committedL,
	tripFuelL: option.projection.fuelL,
	remainingL: option.projection.fuelMeasurable ? Math.round((num(vehicle.weeklyFuelQuotaL) - option.committedL - option.projection.fuelL) * 100) / 100 : null,
	distanceKm: option.projection.distanceKm,
});

export const toVehicleOptionDTO = (option) => ({
	vehicle: toVehicleBriefDTO(option.vehicle),
	tripNumber: option.tripNumber,
	existingTripCode: option.trip?.code ?? null,
	stopAtOutlet: option.stopAtOutlet,
	currentLoad: { stopCount: option.stops.length, weightKg: option.load.weightKg, volumeM3: option.load.volumeM3 },
	rank: option.rank,
	recommended: option.recommended,
	score: option.score,
	reasons: option.reasons,
	...toEvaluationDTO(option.evaluation),
	fuel: toFuelDTO(option, option.vehicle),
	estimatedArrivalMin: option.projection.targetArrivalMin,
	tripChoices: option.tripChoices,
});

export const toTripSummaryDTO = (trip) => ({
	id: trip.id,
	code: trip.code,
	tripNumber: trip.tripNumber,
	status: trip.status,
	vehicle: { id: trip.vehicle.id, code: trip.vehicle.code },
	plannedWeightKg: num(trip.plannedWeightKg),
	plannedVolumeM3: num(trip.plannedVolumeM3),
	plannedDistanceKm: num(trip.plannedDistanceKm),
	plannedFuelL: num(trip.plannedFuelL),
	stopCount: trip.stops.length,
});

export const toAllocationDTO = ({ allocation, order, trip, stop, evaluation, planVersion }) => ({
	allocationId: allocation.id,
	allocatedAt: allocation.allocatedAt,
	order: { id: order.id, reference: order.reference, status: "PLANNED" },
	trip: toTripSummaryDTO(trip),
	stop: { id: stop.id, sequence: stop.sequence, outletId: stop.outletId },
	verdict: evaluation.verdict,
	warningsAcknowledged: allocation.warningsAcknowledged ?? [],
	checks: evaluation.checks,
	planVersion,
});
