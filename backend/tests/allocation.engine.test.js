import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAllocation, projectTrip, rankVehicleOptions, scoreOption, weekStartOf, haversineKm } from "../src/modules/allocations/allocation.engine.js";

const base = () => ({
	order: { status: "CONFIRMED", depotId: "D1", deliveryDate: "2026-10-05", tempClass: "AMBIENT", vanOnly: false, totalWeightKg: 100, totalVolumeM3: 1, windowStartMin: 360, windowEndMin: 600 },
	vehicle: { homeDepotId: "D1", isActive: true, status: "AVAILABLE", type: "DRY_BOX_TRUCK", isRefrigerated: false, maxWeightKg: 1000, maxVolumeM3: 10 },
	trip: { status: null, weightKg: 0, volumeM3: 0 },
	tripNumber: 1,
	tripDate: "2026-10-05",
	isOperatingDay: true,
	fuel: { measurable: true, quotaL: 200, committedL: 10, tripFuelL: 10 },
	arrivalMin: 420,
	deferral: null,
});
const status = (result, code) => result.checks.find((c) => c.code === code)?.status;

test("a clean allocation passes with no warnings", () => {
	const r = evaluateAllocation(base());
	assert.equal(r.verdict, "PASS");
	assert.equal(r.warnings.length, 0);
});

test("weight exactly at the limit is allowed but flagged NEAR_CAPACITY (WARN)", () => {
	const input = base();
	input.order.totalWeightKg = 1000;
	const r = evaluateAllocation(input);
	assert.equal(status(r, "WEIGHT"), "PASS");
	assert.equal(status(r, "NEAR_CAPACITY"), "WARN");
	assert.equal(r.verdict, "WARN");
});

test("one kilogram over the limit is a hard FAIL", () => {
	const input = base();
	input.order.totalWeightKg = 1000.01;
	const r = evaluateAllocation(input);
	assert.equal(status(r, "WEIGHT"), "FAIL");
	assert.equal(r.verdict, "FAIL");
	assert.equal(r.checks.some((c) => c.code === "NEAR_CAPACITY"), false, "overflow is reported by WEIGHT only");
});

test("cumulative trip load counts toward capacity and volume", () => {
	const input = base();
	input.trip = { status: "PLANNED", weightKg: 950, volumeM3: 9.5 };
	input.order.totalWeightKg = 60;
	assert.equal(status(evaluateAllocation(input), "WEIGHT"), "FAIL");
	input.order.totalWeightKg = 10;
	input.order.totalVolumeM3 = 0.6;
	assert.equal(status(evaluateAllocation(input), "VOLUME"), "FAIL");
});

test("NEAR_CAPACITY threshold is inclusive at 90%", () => {
	const input = base();
	input.order.totalWeightKg = 899;
	assert.equal(status(evaluateAllocation(input), "NEAR_CAPACITY"), "PASS");
	input.order.totalWeightKg = 900;
	assert.equal(status(evaluateAllocation(input), "NEAR_CAPACITY"), "WARN");
});

test("chilled/frozen cargo needs a refrigerated vehicle", () => {
	for (const tempClass of ["CHILLED", "FROZEN"]) {
		const input = base();
		input.order.tempClass = tempClass;
		assert.equal(status(evaluateAllocation(input), "TEMPERATURE"), "FAIL");
		input.vehicle.isRefrigerated = true;
		assert.equal(status(evaluateAllocation(input), "TEMPERATURE"), "PASS");
	}
});

test("van-only outlets reject trucks and accept vans", () => {
	const input = base();
	input.order.vanOnly = true;
	assert.equal(status(evaluateAllocation(input), "VAN_ONLY"), "FAIL");
	input.vehicle.type = "VAN";
	assert.equal(status(evaluateAllocation(input), "VAN_ONLY"), "PASS");
});

test("a vehicle can run at most two routes per day", () => {
	const input = base();
	input.tripNumber = 3;
	assert.equal(status(evaluateAllocation(input), "TRIP_LIMIT"), "FAIL");
	input.tripNumber = 0;
	assert.equal(status(evaluateAllocation(input), "TRIP_LIMIT"), "FAIL");
	input.tripNumber = 2;
	assert.equal(status(evaluateAllocation(input), "TRIP_LIMIT"), "PASS");
});

test("depot mismatch, wrong date, non-operating day and locked trips are hard failures", () => {
	let input = base(); input.vehicle.homeDepotId = "D2";
	assert.equal(status(evaluateAllocation(input), "DEPOT"), "FAIL");
	input = base(); input.tripDate = "2026-10-06";
	assert.equal(status(evaluateAllocation(input), "DELIVERY_DATE"), "FAIL");
	input = base(); input.isOperatingDay = false;
	assert.equal(status(evaluateAllocation(input), "OPERATING_DAY"), "FAIL");
	input = base(); input.trip.status = "LOADING";
	assert.equal(status(evaluateAllocation(input), "TRIP_STATE"), "FAIL");
});

test("only confirmed or deferred orders can be allocated", () => {
	for (const s of ["CONFIRMED", "DEFERRED"]) { const i = base(); i.order.status = s; assert.equal(status(evaluateAllocation(i), "ORDER_STATUS"), "PASS"); }
	for (const s of ["DRAFT", "PENDING_REVIEW", "PLANNED", "DELIVERED", "CANCELLED"]) { const i = base(); i.order.status = s; assert.equal(status(evaluateAllocation(i), "ORDER_STATUS"), "FAIL"); }
});

test("inactive or maintenance vehicles are blocked", () => {
	let input = base(); input.vehicle.isActive = false;
	assert.equal(status(evaluateAllocation(input), "VEHICLE_ACTIVE"), "FAIL");
	input = base(); input.vehicle.status = "MAINTENANCE";
	assert.equal(status(evaluateAllocation(input), "VEHICLE_ACTIVE"), "FAIL");
});

test("fuel quota: WARN near limit, FAIL over, WARN (not FAIL) when unmeasurable", () => {
	let input = base(); input.fuel = { measurable: true, quotaL: 100, committedL: 70, tripFuelL: 20 };
	assert.equal(status(evaluateAllocation(input), "FUEL_QUOTA"), "WARN");
	input.fuel = { measurable: true, quotaL: 100, committedL: 80, tripFuelL: 20.01 };
	assert.equal(status(evaluateAllocation(input), "FUEL_QUOTA"), "FAIL");
	input.fuel = { measurable: true, quotaL: 100, committedL: 50, tripFuelL: 20 };
	assert.equal(status(evaluateAllocation(input), "FUEL_QUOTA"), "PASS");
	input.fuel = { measurable: false };
	const r = evaluateAllocation(input);
	assert.equal(status(r, "FUEL_QUOTA"), "WARN");
	assert.equal(r.verdict, "WARN");
});

test("delivery window: late is WARN (not FAIL), early is INFO, unknown is INFO", () => {
	const input = base();
	input.arrivalMin = 601;
	assert.equal(status(evaluateAllocation(input), "DELIVERY_WINDOW"), "WARN");
	input.arrivalMin = 600;
	assert.equal(status(evaluateAllocation(input), "DELIVERY_WINDOW"), "PASS");
	input.arrivalMin = 300;
	assert.equal(status(evaluateAllocation(input), "DELIVERY_WINDOW"), "INFO");
	input.arrivalMin = null;
	assert.equal(status(evaluateAllocation(input), "DELIVERY_WINDOW"), "INFO");
});

test("repeat deferral is informational only", () => {
	const input = base(); input.deferral = { consecutiveCount: 2 };
	const r = evaluateAllocation(input);
	assert.equal(status(r, "REPEAT_DEFERRAL"), "INFO");
	assert.equal(r.verdict, "PASS");
});

test("FAIL outranks WARN outranks PASS in the verdict", () => {
	const input = base();
	input.arrivalMin = 700; // WARN
	assert.equal(evaluateAllocation(input).verdict, "WARN");
	input.order.tempClass = "FROZEN"; // FAIL
	assert.equal(evaluateAllocation(input).verdict, "FAIL");
});

test("the engine is pure: identical input gives identical output and input is not mutated", () => {
	const input = base();
	const snapshot = JSON.stringify(input);
	assert.deepEqual(evaluateAllocation(input), evaluateAllocation(input));
	assert.equal(JSON.stringify(input), snapshot);
});

test("ranking puts PASS before WARN before FAIL and flags exactly one recommendation", () => {
	const make = (code, mutate) => {
		const input = base(); mutate(input);
		const evaluation = evaluateAllocation(input);
		const vehicle = { code, ...input.vehicle };
		return { vehicle, order: input.order, stopAtOutlet: false, trip: { stopCount: 0, weightKg: 0 }, evaluation, ...scoreOption({ vehicle, order: input.order, stopAtOutlet: false, trip: { stopCount: 0 }, evaluation }) };
	};
	const ranked = rankVehicleOptions([
		make("C-FAIL", (i) => { i.order.tempClass = "FROZEN"; }),
		make("B-WARN", (i) => { i.arrivalMin = 900; }),
		make("A-PASS", () => {}),
	]);
	assert.deepEqual(ranked.map((o) => o.vehicle.code), ["A-PASS", "B-WARN", "C-FAIL"]);
	assert.deepEqual(ranked.map((o) => o.recommended), [true, false, false]);
});

test("ranking never recommends when every option fails", () => {
	const input = base(); input.order.tempClass = "FROZEN";
	const evaluation = evaluateAllocation(input);
	const ranked = rankVehicleOptions([{ vehicle: { code: "X" }, evaluation, score: 0 }]);
	assert.equal(ranked[0].recommended, false);
});

test("projectTrip estimates distance, fuel and arrival; unmeasurable without coordinates", () => {
	const depot = { lat: 6.9271, lng: 79.8612 };
	const stops = [{ lat: 6.9, lng: 79.9 }, { lat: 6.95, lng: 79.95 }];
	const p = projectTrip({ depot, stops, fuelKmPerLitre: 5, targetIndex: 1 });
	assert.equal(p.routeMeasurable, true);
	assert.ok(p.distanceKm > 0 && p.fuelL > 0);
	assert.equal(p.legs.length, 2);
	assert.ok(p.arrivalsMin[1] > p.arrivalsMin[0]);
	assert.equal(p.targetArrivalMin, p.arrivalsMin[1]);

	const blind = projectTrip({ depot, stops: [{ lat: null, lng: null }], fuelKmPerLitre: 5, targetIndex: 0 });
	assert.equal(blind.routeMeasurable, false);
	assert.equal(blind.targetArrivalMin, null);
	assert.equal(projectTrip({ depot, stops, fuelKmPerLitre: null }).fuelMeasurable, false);
});

test("helpers: haversine and ISO week start", () => {
	assert.ok(Math.abs(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111.19) < 0.5);
	assert.equal(weekStartOf("2026-10-05"), "2026-10-05"); // Monday
	assert.equal(weekStartOf("2026-10-11"), "2026-10-05"); // Sunday belongs to the Monday before
	assert.equal(weekStartOf("2026-10-07"), "2026-10-05");
});
