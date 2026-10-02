import { toNumber, roundTo } from "../../utils/serialize.js";

const toVehicleRefDTO = (vehicle) => ({
    id: vehicle.id,
    code: vehicle.code,
    type: vehicle.type,
    isRefrigerated: vehicle.isRefrigerated,
    maxWeightKg: toNumber(vehicle.maxWeightKg),
    maxVolumeM3: toNumber(vehicle.maxVolumeM3),
});

// one candidate (vehicle + trip slot) with its checks and the reasons behind its ranking
export const toVehicleOptionDTO = (option) => ({
    vehicle: toVehicleRefDTO(option.vehicle),
    tripNumber: option.tripNumber,
    tripId: option.trip?.id ?? null,
    existingTrip: Boolean(option.trip),
    stopCount: option.trip?.stops.length ?? 0,
    hasStopForOutlet: option.hasStopForOutlet,
    verdict: option.verdict,
    checks: option.checks,
    warnings: option.checks.filter((check) => check.status === "WARN").map((check) => check.code),
    failures: option.checks.filter((check) => check.status === "FAIL").map((check) => ({ code: check.code, message: check.message })),
    remaining: {
        weightKg: roundTo(option.remaining.weightKg, 2),
        volumeM3: roundTo(option.remaining.volumeM3, 3),
    },
    reasons: option.reasons,
});

export const toVehicleOptionsDTO = ({ order, plan, sort, feasible, blocked }) => ({
    orderId: order.id,
    reference: order.reference,
    deliveryDate: order.deliveryDate,
    planId: plan.id,
    planStatus: plan.status,
    sort,
    feasible: feasible.map(toVehicleOptionDTO),
    blocked: blocked.map(toVehicleOptionDTO),
});

export const toValidationDTO = ({ orderId, vehicleId, tripNumber, verdict, checks }) => ({
    orderId,
    vehicleId,
    tripNumber,
    verdict,
    canAllocate: verdict !== "FAIL",
    warningsToAcknowledge: checks.filter((check) => check.status === "WARN").map((check) => check.code),
    checks,
});

export const toAllocationDTO = ({ order, trip, vehicle, stop, checks, acknowledged, totals, createdTrip, createdStop }) => ({
    orderId: order.id,
    reference: order.reference,
    status: "PLANNED",
    trip: { id: trip.id, code: trip.code, tripNumber: trip.tripNumber, created: createdTrip },
    vehicle: { id: vehicle.id, code: vehicle.code },
    stop: { id: stop.id, sequence: stop.sequence, created: createdStop },
    verdict: checks.some((check) => check.status === "WARN") ? "WARN" : "PASS",
    checks,
    acknowledgedWarnings: acknowledged,
    tripTotals: {
        weightKg: totals.weightKg,
        volumeM3: totals.volumeM3,
        distanceKm: totals.distanceKm,
        fuelL: totals.fuelL,
        measurable: totals.measurable,
    },
});

export const toUnallocationDTO = ({ order, tripCode, tripDeleted }) => ({
    orderId: order.id,
    reference: order.reference,
    status: "CONFIRMED",
    tripCode,
    tripDeleted,
});

// the unique FAIL reasons across every vehicle / trip option
export const toUnallocatableReasonsDTO = (reasons) => reasons;
