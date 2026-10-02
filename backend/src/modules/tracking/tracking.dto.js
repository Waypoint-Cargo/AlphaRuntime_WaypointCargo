import { toNumber, toWindowDTO } from "../../utils/serialize.js";

const FINAL_STOP_STATUSES = ["COMPLETED", "PARTIAL", "FAILED", "SKIPPED"];

const toOutletRef = (outlet) => ({ id: outlet.id, code: outlet.code, name: outlet.name });

// ---- pings ----

export const toPingsResultDTO = ({ tripId, accepted, skipped }) => ({ tripId, accepted, skipped });

const toPingDTO = (ping) => ({
    lat: toNumber(ping.lat),
    lng: toNumber(ping.lng),
    speedKmh: toNumber(ping.speedKmh),
    recordedAt: ping.recordedAt,
});

// ---- the dispatcher's live view ----

// trip: a live trip row; lastPing: the trip's newest ping or null; next: the next pending stop or null;
// delayed and nextAtRisk come from the service (the rule lives there)
export const toLiveTripDTO = ({ trip, lastPing, next, nextAtRisk, delayed }) => ({
    tripId: trip.id,
    code: trip.code,
    tripNumber: trip.tripNumber,
    status: trip.status,
    vehicle: { id: trip.vehicle.id, code: trip.vehicle.code },
    driver: trip.driver ? { id: trip.driver.id, fullName: trip.driver.fullName, phone: trip.driver.phone ?? null } : null,
    lastPing: lastPing ? { lat: lastPing.lat, lng: lastPing.lng, recordedAt: lastPing.recordedAt } : null,
    stops: {
        completed: trip.stops.filter((stop) => stop.status === "COMPLETED" || stop.status === "PARTIAL").length,
        failed: trip.stops.filter((stop) => stop.status === "FAILED" || stop.status === "SKIPPED").length,
        total: trip.stops.length,
    },
    nextStop: next
        ? {
              stopId: next.id,
              sequence: next.sequence,
              outlet: toOutletRef(next.outlet),
              window: toWindowDTO(next.outlet.windowStartMin, next.outlet.windowEndMin),
              mallAccessWindow: toWindowDTO(next.outlet.mallAccessStartMin, next.outlet.mallAccessEndMin),
              predictedArrival: next.predictedArrival ?? null,
              atRisk: nextAtRisk,
          }
        : null,
    delayed,
});

export const toLiveTrackingDTO = ({ date, active, delayed, deliveredToday, trips }) => ({
    date,
    counts: { active, delayed, deliveredToday },
    trips,
});

// ---- the store manager's view: their own stop only ----

export const toOutletTripDTO = ({ trip, own, before }) => ({
    tripId: trip.id,
    code: trip.code,
    status: trip.status,
    driver: trip.driver ? { fullName: trip.driver.fullName } : null,
    vehicle: { code: trip.vehicle.code },
    stop: {
        stopId: own.id,
        sequence: own.sequence,
        status: own.status,
        window: toWindowDTO(own.outlet.windowStartMin, own.outlet.windowEndMin),
        mallAccessWindow: toWindowDTO(own.outlet.mallAccessStartMin, own.outlet.mallAccessEndMin),
        predictedArrival: own.predictedArrival ?? null,
        arrivedAt: own.arrivedAt ?? null,
        completedAt: own.completedAt ?? null,
    },
    stopsBefore: before.length,
    stopsBeforeRemaining: before.filter((stop) => !FINAL_STOP_STATUSES.includes(stop.status)).length,
});

export const toOutletTrackingDTO = ({ date, trips }) => ({ date, trips });

// ---- one trip ----

export const toTripTrackingDTO = ({ trip, pings, stops }) => ({
    tripId: trip.id,
    code: trip.code,
    status: trip.status,
    pings: pings.map(toPingDTO),
    stops: stops.map((stop) => ({
        stopId: stop.id,
        sequence: stop.sequence,
        status: stop.status,
        outlet: toOutletRef(stop.outlet),
        window: toWindowDTO(stop.outlet.windowStartMin, stop.outlet.windowEndMin),
        predictedArrival: stop.predictedArrival ?? null,
        arrivedAt: stop.arrivedAt ?? null,
        unloadingStartedAt: stop.unloadingStartedAt ?? null,
        completedAt: stop.completedAt ?? null,
        failureReason: stop.failureReason ?? null,
    })),
});
