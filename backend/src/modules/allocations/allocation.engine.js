// Pure allocation business-rule engine.
// It imports nothing: no Prisma, no services, no clock. The caller resolves every fact (vehicle, trip load, fuel
// position, calendar, deferral history) and passes it in, so every rule is unit-testable and explainable.
//
// Check statuses:  PASS  - rule satisfied
//                  WARN  - allowed, but the dispatcher must acknowledge it ("Allocate with warnings")
//                  FAIL  - hard block, the allocation can never be saved
//                  INFO  - context only, never affects the verdict

export const DEFAULTS = Object.freeze({
	nearCapacityRatio: 0.9, // weight or volume at/above this share of the vehicle limit -> WARN
	nearFuelRatio: 0.9, // projected weekly fuel at/above this share of the quota -> WARN
	avgSpeedKmh: 30, // urban average used for arrival estimates
	serviceMinutes: 15, // dwell time per stop used for arrival estimates
	departureMin: 6 * 60, // trips are assumed to leave the depot at 06:00 (minutes after midnight, Asia/Colombo)
	roadFactor: 1.3, // straight-line distance -> road distance
	maxTripNumber: 2, // "A vehicle can run up to two routes per day"
});

const COLOMBO_OFFSET_MIN = 5 * 60 + 30;
const ALLOCATABLE_ORDER_STATUSES = ["CONFIRMED", "DEFERRED"];
const VERDICT_RANK = { PASS: 0, WARN: 1, FAIL: 2 };

const toNum = (value) => (value === null || value === undefined ? null : Number(value));
const round2 = (value) => Math.round(value * 100) / 100;
const check = (code, label, status, message, extra = {}) => ({ code, label, status, message, ...extra });

const coord = (point) => {
	const lat = toNum(point?.lat);
	const lng = toNum(point?.lng);
	return lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng) ? null : { lat, lng };
};

export const haversineKm = (a, b) => {
	const rad = (deg) => (deg * Math.PI) / 180;
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};

// Monday of the ISO week containing the YYYY-MM-DD date (FuelLedgerEntry.weekStart).
export const weekStartOf = (dateString) => {
	const date = new Date(`${dateString}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
	return date.toISOString().slice(0, 10);
};

// Converts "minutes after midnight in Colombo" on a delivery date into an absolute Date.
export const colomboMinutesToDate = (deliveryDate, minutes) => {
	const day = deliveryDate instanceof Date ? deliveryDate : new Date(`${deliveryDate}T00:00:00.000Z`);
	return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) + (minutes - COLOMBO_OFFSET_MIN) * 60_000);
};

// Depot -> stops (in order) -> depot. Measurable only when the depot and every stop have coordinates.
// `targetIndex` selects the stop whose arrival time the caller cares about.
export const projectTrip = ({ depot, stops, fuelKmPerLitre, targetIndex = null }, options = {}) => {
	const cfg = { ...DEFAULTS, ...options };
	const empty = { routeMeasurable: false, fuelMeasurable: false, distanceKm: null, fuelL: null, legs: [], arrivalsMin: stops.map(() => null), returnMin: null, targetArrivalMin: null };
	const points = [coord(depot), ...stops.map(coord)];
	if (!points.every(Boolean)) return empty;

	const legs = [];
	for (let i = 1; i < points.length; i += 1) legs.push(round2(haversineKm(points[i - 1], points[i]) * cfg.roadFactor));
	const returnLeg = stops.length ? round2(haversineKm(points[points.length - 1], points[0]) * cfg.roadFactor) : 0;
	const distanceKm = round2(legs.reduce((sum, leg) => sum + leg, 0) + returnLeg);

	const arrivalsMin = [];
	let clock = cfg.departureMin;
	for (const leg of legs) {
		clock += (leg / cfg.avgSpeedKmh) * 60;
		arrivalsMin.push(Math.round(clock));
		clock += cfg.serviceMinutes;
	}
	const returnMin = stops.length ? Math.round(clock - cfg.serviceMinutes + (returnLeg / cfg.avgSpeedKmh) * 60) : null;
	const kmPerLitre = toNum(fuelKmPerLitre);
	const fuelMeasurable = kmPerLitre !== null && kmPerLitre > 0;

	return {
		routeMeasurable: true,
		fuelMeasurable,
		distanceKm,
		fuelL: fuelMeasurable ? round2(distanceKm / kmPerLitre) : null,
		legs,
		arrivalsMin,
		returnMin,
		targetArrivalMin: targetIndex === null ? null : (arrivalsMin[targetIndex] ?? null),
	};
};

// input:
//   order    { status, depotId, deliveryDate:'YYYY-MM-DD', tempClass, vanOnly, totalWeightKg, totalVolumeM3, windowStartMin, windowEndMin }
//   vehicle  { homeDepotId, isActive, status, type, isRefrigerated, maxWeightKg, maxVolumeM3 }
//   trip     { status: null when the trip does not exist yet, weightKg, volumeM3 }  (load EXCLUDING this order)
//   tripNumber, tripDate ('YYYY-MM-DD'), isOperatingDay
//   fuel     { measurable, quotaL, committedL, tripFuelL }   (committedL excludes this trip's own planned fuel)
//   arrivalMin   predicted arrival at the outlet (minutes after midnight) or null
//   deferral     { consecutiveCount } or null
export const evaluateAllocation = (input, options = {}) => {
	const cfg = { ...DEFAULTS, ...options };
	const { order, vehicle, trip, tripNumber, tripDate, isOperatingDay, fuel, arrivalMin, deferral } = input;
	const checks = [];

	const orderStatusOk = ALLOCATABLE_ORDER_STATUSES.includes(order.status);
	checks.push(check("ORDER_STATUS", "Order status", orderStatusOk ? "PASS" : "FAIL",
		orderStatusOk ? "Order is ready to be planned." : `Only confirmed or deferred orders can be allocated (current: ${order.status}).`, { value: order.status }));

	const depotOk = vehicle.homeDepotId === order.depotId;
	checks.push(check("DEPOT", "Depot match", depotOk ? "PASS" : "FAIL",
		depotOk ? "Vehicle operates from the order's depot." : "The vehicle belongs to a different depot than this order."));

	checks.push(check("OPERATING_DAY", "Operating day", isOperatingDay ? "PASS" : "FAIL",
		isOperatingDay ? "Delivery date is an operating day." : "The delivery date is not an operating day.", { value: tripDate }));

	const dateOk = order.deliveryDate === tripDate;
	checks.push(check("DELIVERY_DATE", "Delivery date", dateOk ? "PASS" : "FAIL",
		dateOk ? "Trip runs on the order's delivery date." : `Order is due ${order.deliveryDate}, but the trip runs on ${tripDate}.`, { value: tripDate, limit: order.deliveryDate }));

	const tripNumberOk = Number.isInteger(tripNumber) && tripNumber >= 1 && tripNumber <= cfg.maxTripNumber;
	checks.push(check("TRIP_LIMIT", "Routes per day", tripNumberOk ? "PASS" : "FAIL",
		tripNumberOk ? `Route ${tripNumber} of ${cfg.maxTripNumber} for this vehicle today.` : `A vehicle can run at most ${cfg.maxTripNumber} routes per day.`, { value: tripNumber, limit: cfg.maxTripNumber }));

	const tripOpen = !trip.status || trip.status === "PLANNED" || trip.status === "CANCELLED";
	checks.push(check("TRIP_STATE", "Trip state", tripOpen ? "PASS" : "FAIL",
		tripOpen ? "Trip is still open for allocation." : `The trip is already ${trip.status} and can no longer be changed.`, { value: trip.status ?? "NEW" }));

	const vehicleOk = vehicle.isActive !== false && vehicle.status !== "MAINTENANCE";
	checks.push(check("VEHICLE_ACTIVE", "Vehicle availability", vehicleOk ? "PASS" : "FAIL",
		vehicleOk ? "Vehicle is active and available." : vehicle.status === "MAINTENANCE" ? "The vehicle is under maintenance." : "The vehicle is not active.", { value: vehicle.status }));

	const needsCold = order.tempClass === "CHILLED" || order.tempClass === "FROZEN";
	const tempOk = !needsCold || Boolean(vehicle.isRefrigerated);
	checks.push(check("TEMPERATURE", "Temperature requirement", tempOk ? "PASS" : "FAIL",
		tempOk ? (needsCold ? `Refrigerated vehicle satisfies ${order.tempClass.toLowerCase()} cargo.` : "Ambient cargo - no cold chain needed.") : `${order.tempClass} orders need a refrigerated vehicle.`, { value: order.tempClass }));

	const vanOk = !order.vanOnly || vehicle.type === "VAN";
	checks.push(check("VAN_ONLY", "Outlet vehicle restriction", vanOk ? "PASS" : "FAIL",
		vanOk ? (order.vanOnly ? "Van satisfies the van-only outlet." : "No vehicle restriction at this outlet.") : "This outlet can only be served by a van.", { value: vehicle.type }));

	const maxWeight = toNum(vehicle.maxWeightKg) ?? 0;
	const maxVolume = toNum(vehicle.maxVolumeM3) ?? 0;
	const weight = round2((trip.weightKg ?? 0) + toNum(order.totalWeightKg));
	const volume = Math.round(((trip.volumeM3 ?? 0) + toNum(order.totalVolumeM3)) * 1000) / 1000;
	const weightRatio = maxWeight > 0 ? weight / maxWeight : Infinity;
	const volumeRatio = maxVolume > 0 ? volume / maxVolume : Infinity;

	checks.push(check("WEIGHT", "Weight capacity", weight <= maxWeight ? "PASS" : "FAIL",
		weight <= maxWeight ? `${weight} kg of ${maxWeight} kg after this order.` : `Adding this order makes the trip ${weight} kg, over the ${maxWeight} kg limit.`, { value: weight, limit: maxWeight }));
	checks.push(check("VOLUME", "Volume capacity", volume <= maxVolume ? "PASS" : "FAIL",
		volume <= maxVolume ? `${volume} m3 of ${maxVolume} m3 after this order.` : `Adding this order makes the trip ${volume} m3, over the ${maxVolume} m3 limit.`, { value: volume, limit: maxVolume }));

	// Only meaningful while the load still fits; WEIGHT / VOLUME already report the overflow.
	if (weight <= maxWeight && volume <= maxVolume) {
		const near = weightRatio >= cfg.nearCapacityRatio || volumeRatio >= cfg.nearCapacityRatio;
		const pct = Math.round(Math.max(weightRatio, volumeRatio) * 100);
		checks.push(check("NEAR_CAPACITY", "Near capacity", near ? "WARN" : "PASS",
			near ? `The vehicle would be ${pct}% full - little room for changes.` : `Vehicle would be ${pct}% full.`, { value: pct, limit: Math.round(cfg.nearCapacityRatio * 100) }));
	}

	if (!fuel?.measurable) {
		checks.push(check("FUEL_QUOTA", "Weekly fuel quota", "WARN",
			"Route distance or the vehicle's fuel profile is unavailable, so the weekly fuel quota cannot be verified."));
	} else {
		const projected = round2(fuel.committedL + fuel.tripFuelL);
		const status = projected > fuel.quotaL ? "FAIL" : projected >= fuel.quotaL * cfg.nearFuelRatio ? "WARN" : "PASS";
		checks.push(check("FUEL_QUOTA", "Weekly fuel quota", status,
			status === "FAIL" ? `Projected weekly fuel ${projected} L exceeds the ${fuel.quotaL} L quota.`
				: status === "WARN" ? `Projected weekly fuel ${projected} L is close to the ${fuel.quotaL} L quota.`
					: `Projected weekly fuel ${projected} L of ${fuel.quotaL} L.`, { value: projected, limit: fuel.quotaL }));
	}

	if (arrivalMin === null || arrivalMin === undefined) {
		checks.push(check("DELIVERY_WINDOW", "Delivery window", "INFO", "Arrival time cannot be predicted (missing coordinates)."));
	} else if (order.windowEndMin !== null && order.windowEndMin !== undefined && arrivalMin > order.windowEndMin) {
		checks.push(check("DELIVERY_WINDOW", "Delivery window", "WARN",
			`Estimated arrival is ${arrivalMin - order.windowEndMin} min after the outlet window closes.`, { value: arrivalMin, limit: order.windowEndMin }));
	} else if (order.windowStartMin !== null && order.windowStartMin !== undefined && arrivalMin < order.windowStartMin) {
		checks.push(check("DELIVERY_WINDOW", "Delivery window", "INFO",
			`Estimated arrival is ${order.windowStartMin - arrivalMin} min before the window opens (driver waits).`, { value: arrivalMin, limit: order.windowStartMin }));
	} else {
		checks.push(check("DELIVERY_WINDOW", "Delivery window", "PASS", "Estimated arrival is inside the outlet window.", { value: arrivalMin }));
	}

	if (deferral?.consecutiveCount > 0) {
		checks.push(check("REPEAT_DEFERRAL", "Previously deferred", "INFO",
			`This outlet was deferred on ${deferral.consecutiveCount} consecutive run(s) - prioritise it.`, { value: deferral.consecutiveCount }));
	}

	const verdict = checks.some((c) => c.status === "FAIL") ? "FAIL" : checks.some((c) => c.status === "WARN") ? "WARN" : "PASS";
	return {
		verdict,
		checks,
		blockers: checks.filter((c) => c.status === "FAIL"),
		warnings: checks.filter((c) => c.status === "WARN"),
		projected: {
			weightKg: weight,
			volumeM3: volume,
			weightRatio: Number.isFinite(weightRatio) ? round2(weightRatio) : null,
			volumeRatio: Number.isFinite(volumeRatio) ? round2(volumeRatio) : null,
		},
	};
};

// Scores one evaluated option so the UI can explain "why this vehicle".
// option: { vehicle, order, stopAtOutlet, trip:{ stopCount, weightKg }, evaluation }
export const scoreOption = ({ vehicle, order, stopAtOutlet, trip, evaluation }) => {
	const reasons = [];
	let score = 0;

	if (stopAtOutlet) { score += 40; reasons.push("Already delivering to this outlet on this route - no extra stop."); }
	if (!stopAtOutlet && trip.stopCount > 0) { score += 15; reasons.push("Consolidates onto a route that already has stops."); }

	const fill = Math.max(evaluation.projected.weightRatio ?? 0, evaluation.projected.volumeRatio ?? 0);
	if (evaluation.verdict !== "FAIL") {
		score += Math.round(30 * Math.min(fill, 1));
		reasons.push(`Best-fit capacity: ${Math.round(fill * 100)}% full after this order.`);
	}

	const needsCold = order.tempClass === "CHILLED" || order.tempClass === "FROZEN";
	if (needsCold && vehicle.isRefrigerated) { score += 5; reasons.push(`Refrigerated - suits ${order.tempClass.toLowerCase()} cargo.`); }
	if (!needsCold && vehicle.isRefrigerated) { score -= 5; reasons.push("Refrigerated vehicle used for ambient cargo (kept free for cold orders if possible)."); }
	if (order.vanOnly && vehicle.type === "VAN") { score += 5; reasons.push("Van meets the outlet's van-only rule."); }

	score -= evaluation.warnings.length * 10;
	if (evaluation.verdict === "PASS") reasons.push("All constraint checks pass.");
	if (evaluation.warnings.length) reasons.push(`${evaluation.warnings.length} warning(s) need acknowledgement.`);
	if (evaluation.verdict === "FAIL") reasons.unshift(...evaluation.blockers.map((b) => b.message));

	return { score, reasons };
};

// options: [{ vehicle, evaluation, score, ... }] -> sorted best-first, with `recommended` set on the first non-FAIL option.
export const rankVehicleOptions = (options) => {
	const ranked = [...options].sort((a, b) =>
		VERDICT_RANK[a.evaluation.verdict] - VERDICT_RANK[b.evaluation.verdict]
		|| b.score - a.score
		|| String(a.vehicle.code).localeCompare(String(b.vehicle.code)));
	let recommendedSet = false;
	return ranked.map((option, index) => {
		const recommended = !recommendedSet && option.evaluation.verdict !== "FAIL";
		if (recommended) recommendedSet = true;
		return { ...option, rank: index + 1, recommended };
	});
};
