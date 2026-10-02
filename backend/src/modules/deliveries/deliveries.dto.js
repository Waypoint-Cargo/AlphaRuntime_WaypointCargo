import { businessMinutesOfDay, toYmd } from "../../utils/businessTime.js";
import { toNumber, toWindowDTO } from "../../utils/serialize.js";

const FINAL_STOP_STATUSES = ["COMPLETED", "PARTIAL", "FAILED", "SKIPPED"];
const DONE_STOP_STATUSES = ["COMPLETED", "PARTIAL"];
const FAILED_STOP_STATUSES = ["FAILED", "SKIPPED"];

const toOutletDTO = (outlet) => ({
    id: outlet.id,
    code: outlet.code,
    name: outlet.name,
    brand: outlet.brand,
    district: outlet.district,
    address: outlet.address ?? null,
    lat: toNumber(outlet.lat),
    lng: toNumber(outlet.lng),
    phone: outlet.phone ?? null,
    isMall: outlet.isMall,
    unloadingType: outlet.unloadingType ?? null,
    unloadingNotes: outlet.unloadingNotes ?? null,
    window: toWindowDTO(outlet.windowStartMin, outlet.windowEndMin),
    mallAccessWindow: toWindowDTO(outlet.mallAccessStartMin, outlet.mallAccessEndMin),
});

const toItemDTO = (item, deliveredQty) => {
    const check = item.loadingChecks[0] ?? null;
    return {
        orderItemId: item.id,
        lineNo: item.lineNo,
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        loadedQty: check?.loadedQty ?? null,
        loadStatus: check?.status ?? null,
        deliveredQty: deliveredQty ?? null,
    };
};

const toStopBundleDTO = (stop) => {
    const delivered = new Map(stop.deliveredLines.map((line) => [line.orderItemId, line.deliveredQty]));

    return {
        stopId: stop.id,
        sequence: stop.sequence,
        status: stop.status,
        outlet: toOutletDTO(stop.outlet),
        plannedArrival: stop.plannedArrival ?? null,
        predictedArrival: stop.predictedArrival ?? null,
        arrivedAt: stop.arrivedAt ?? null,
        unloadingStartedAt: stop.unloadingStartedAt ?? null,
        completedAt: stop.completedAt ?? null,
        failureReason: stop.failureReason ?? null,
        hasProof: stop.proof !== null,
        orders: stop.allocations.map(({ order }) => ({
            orderId: order.id,
            reference: order.reference,
            status: order.status,
            specialInstructions: order.specialInstructions ?? null,
            items: order.items.map((item) => toItemDTO(item, delivered.get(item.id))),
        })),
    };
};

export const toTripBundleDTO = (trip) => ({
    tripId: trip.id,
    code: trip.code,
    tripNumber: trip.tripNumber,
    status: trip.status,
    planStatus: trip.plan.status,
    deliveryDate: toYmd(trip.deliveryDate),
    depot: trip.plan.depot,
    vehicle: trip.vehicle,
    plannedDeparture: trip.plannedDeparture ?? null,
    plannedReturn: trip.plannedReturn ?? null,
    actualDeparture: trip.actualDeparture ?? null,
    actualReturn: trip.actualReturn ?? null,
    stops: trip.stops.map(toStopBundleDTO),
});

// The newest change anywhere in the bundle, so the app can tell whether its copy is out of date.
// (Stops have no updatedAt: their own timestamps and the proof's arrival time count instead.)
const bundleVersionOf = (trips) => {
    let latest = 0;
    const see = (date) => {
        if (date && date.getTime() > latest) latest = date.getTime();
    };

    for (const trip of trips) {
        see(trip.updatedAt);
        for (const stop of trip.stops) {
            see(stop.arrivedAt);
            see(stop.unloadingStartedAt);
            see(stop.completedAt);
            see(stop.proof?.receivedAt);
            for (const { order } of stop.allocations) {
                see(order.updatedAt);
                for (const item of order.items) for (const check of item.loadingChecks) see(check.checkedAt);
            }
        }
    }
    return latest === 0 ? null : new Date(latest).toISOString();
};

export const toRouteBundleDTO = ({ date, trips }) => ({
    date,
    bundleVersion: bundleVersionOf(trips),
    trips: trips.map(toTripBundleDTO),
});

// ---- summary ----

// On time = arrived no later than the end of the outlet's delivery window (of its mall access window,
// when that ends earlier).
const isOnTime = (stop) => {
    if (!stop.arrivedAt) return false;
    const { windowEndMin, isMall, mallAccessEndMin } = stop.outlet;
    const end = isMall && mallAccessEndMin !== null ? Math.min(windowEndMin, mallAccessEndMin) : windowEndMin;
    return businessMinutesOfDay(stop.arrivedAt) <= end;
};

// the next stop to drive to: the first unfinished stop of a trip that is loaded or on the road
const pickNextStop = (stops) => {
    const next = stops.find(
        (stop) => ["LOADED", "IN_TRANSIT"].includes(stop.trip.status) && !FINAL_STOP_STATUSES.includes(stop.status),
    );
    return next
        ? {
              stopId: next.id,
              tripId: next.trip.id,
              tripCode: next.trip.code,
              sequence: next.sequence,
              status: next.status,
              outlet: { id: next.outlet.id, code: next.outlet.code, name: next.outlet.name },
              predictedArrival: next.predictedArrival ?? null,
          }
        : null;
};

// stops arrive ordered by trip number, then sequence
export const toDeliveriesSummaryDTO = ({ date, stops }) => ({
    date,
    totalStops: stops.length,
    completedStops: stops.filter((stop) => DONE_STOP_STATUSES.includes(stop.status)).length,
    failedStops: stops.filter((stop) => FAILED_STOP_STATUSES.includes(stop.status)).length,
    onTimeStops: stops.filter(isOnTime).length,
    nextStop: pickNextStop(stops),
});

// ---- answers to a stop event or a proof ----

export const toStopStateDTO = (stop) => ({
    stopId: stop.id,
    tripId: stop.tripId,
    tripCode: stop.trip.code,
    tripStatus: stop.trip.status,
    planStatus: stop.trip.plan.status,
    sequence: stop.sequence,
    status: stop.status,
    arrivedAt: stop.arrivedAt ?? null,
    unloadingStartedAt: stop.unloadingStartedAt ?? null,
    completedAt: stop.completedAt ?? null,
    failureReason: stop.failureReason ?? null,
    hasProof: stop.proof !== null,
    orders: stop.allocations.map(({ order }) => ({ orderId: order.id, reference: order.reference, status: order.status })),
});
