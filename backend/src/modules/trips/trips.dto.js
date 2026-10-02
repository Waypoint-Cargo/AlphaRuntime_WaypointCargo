import { toYmd } from "../../utils/businessTime.js";
import { toNumber, toWindowDTO } from "../../utils/serialize.js";

const toIso = (date) => (date ? date.toISOString() : null);

export const toTripSummaryDTO = (trip) => ({
    id: trip.id,
    code: trip.code,
    planId: trip.planId,
    depotId: trip.plan.depotId,
    planStatus: trip.plan.status,
    deliveryDate: toYmd(trip.deliveryDate),
    tripNumber: trip.tripNumber,
    status: trip.status,
    vehicle: {
        id: trip.vehicle.id,
        code: trip.vehicle.code,
        type: trip.vehicle.type,
        isRefrigerated: trip.vehicle.isRefrigerated,
        maxWeightKg: toNumber(trip.vehicle.maxWeightKg),
        maxVolumeM3: toNumber(trip.vehicle.maxVolumeM3),
    },
    driver: trip.driver ? { id: trip.driver.id, fullName: trip.driver.fullName } : null,
    stopCount: trip._count.stops,
    plannedWeightKg: toNumber(trip.plannedWeightKg),
    plannedVolumeM3: toNumber(trip.plannedVolumeM3),
    plannedDistanceKm: toNumber(trip.plannedDistanceKm),
    plannedFuelL: toNumber(trip.plannedFuelL),
    plannedDeparture: toIso(trip.plannedDeparture),
    plannedReturn: toIso(trip.plannedReturn),
});

export const toTripListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toTripSummaryDTO),
    pagination: { page, pageSize, total },
});

const toStopDTO = (stop) => ({
    id: stop.id,
    sequence: stop.sequence,
    status: stop.status,
    plannedArrival: toIso(stop.plannedArrival),
    predictedArrival: toIso(stop.predictedArrival),
    legDistanceKm: toNumber(stop.legDistanceKm),
    outlet: {
        id: stop.outlet.id,
        code: stop.outlet.code,
        name: stop.outlet.name,
        district: stop.outlet.district,
        address: stop.outlet.address ?? null,
        lat: toNumber(stop.outlet.lat),
        lng: toNumber(stop.outlet.lng),
        isMall: stop.outlet.isMall,
        vanOnly: stop.outlet.vanOnly,
        window: toWindowDTO(stop.outlet.windowStartMin, stop.outlet.windowEndMin),
        mallAccessWindow: toWindowDTO(stop.outlet.mallAccessStartMin, stop.outlet.mallAccessEndMin),
        unloadingType: stop.outlet.unloadingType ?? null,
        unloadingNotes: stop.outlet.unloadingNotes ?? null,
    },
    orders: stop.allocations.map(({ order }) => ({
        id: order.id,
        reference: order.reference,
        tempClass: order.tempClass,
        weightKg: toNumber(order.totalWeightKg),
        volumeM3: toNumber(order.totalVolumeM3),
        itemCount: order.itemCount,
    })),
});

export const toTripDetailDTO = (trip) => ({
    ...toTripSummaryDTO(trip),
    depot: { id: trip.plan.depot.id, code: trip.plan.depot.code, name: trip.plan.depot.name },
    stops: trip.stops.map(toStopDTO),
});

export const toSequenceRequestDTO = (request) => ({
    id: request.id,
    tripId: request.tripId,
    tripCode: request.trip.code,
    requestedBy: { id: request.requestedBy.id, fullName: request.requestedBy.fullName },
    proposedStopIds: request.proposedSequence,
    reason: request.reason ?? null,
    status: request.status,
    decidedById: request.decidedById ?? null,
    decidedAt: toIso(request.decidedAt),
    createdAt: toIso(request.createdAt),
});

export const toSequenceRequestListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toSequenceRequestDTO),
    pagination: { page, pageSize, total },
});

// plain shapes for other modules (allocation engine)

export const toDepotTripDTO = (trip) => ({
    id: trip.id,
    code: trip.code,
    planId: trip.planId,
    planStatus: trip.plan.status,
    depot: { lat: toNumber(trip.plan.depot.lat), lng: toNumber(trip.plan.depot.lng) },
    vehicleId: trip.vehicleId,
    tripNumber: trip.tripNumber,
    status: trip.status,
    plannedWeightKg: toNumber(trip.plannedWeightKg),
    plannedVolumeM3: toNumber(trip.plannedVolumeM3),
    plannedDistanceKm: toNumber(trip.plannedDistanceKm),
    plannedFuelL: toNumber(trip.plannedFuelL),
    stops: trip.stops.map((stop) => ({
        id: stop.id,
        sequence: stop.sequence,
        outletId: stop.outletId,
        predictedArrival: stop.predictedArrival ?? null,
        outlet: {
            district: stop.outlet.district,
            lat: toNumber(stop.outlet.lat),
            lng: toNumber(stop.outlet.lng),
            sourceAttributes: stop.outlet.sourceAttributes,
        },
    })),
});

export const toVehicleTripDTO = (trip) => ({
    id: trip.id,
    code: trip.code,
    tripNumber: trip.tripNumber,
    status: trip.status,
    plannedWeightKg: toNumber(trip.plannedWeightKg),
    plannedVolumeM3: toNumber(trip.plannedVolumeM3),
});

export const toVehicleCountsDTO = ({ withTrips, inTransit }) => ({ withTrips, inTransit });

// ---- prompt 3: plain shapes for the loading, deliveries, issues and sync modules ----

const toTripRef = (trip) => ({
    id: trip.id,
    code: trip.code,
    status: trip.status,
    planId: trip.planId,
    planStatus: trip.plan.status,
    depotId: trip.plan.depotId,
    deliveryDate: toYmd(trip.deliveryDate),
    vehicleId: trip.vehicleId,
    driverId: trip.driverId ?? null,
    tripNumber: trip.tripNumber,
    actualDeparture: trip.actualDeparture ?? null,
});

export const toTripRefDTO = toTripRef;

export const toStopRefDTO = (stop) => ({
    id: stop.id,
    tripId: stop.tripId,
    outletId: stop.outletId,
    outlet: {
        code: stop.outlet.code,
        name: stop.outlet.name,
        brand: stop.outlet.brand,
        isMall: stop.outlet.isMall,
        window: toWindowDTO(stop.outlet.windowStartMin, stop.outlet.windowEndMin),
        mallAccessWindow: toWindowDTO(stop.outlet.mallAccessStartMin, stop.outlet.mallAccessEndMin),
    },
    sequence: stop.sequence,
    status: stop.status,
    arrivedAt: stop.arrivedAt ?? null,
    unloadingStartedAt: stop.unloadingStartedAt ?? null,
    completedAt: stop.completedAt ?? null,
    failureReason: stop.failureReason ?? null,
    trip: toTripRef(stop.trip),
});

export const toTripOrderDTO = ({ stopId, order }) => ({
    stopId,
    orderId: order.id,
    reference: order.reference,
    status: order.status,
    outletId: order.outletId,
});

export const toStopOrderDTO = ({ order }) => ({
    orderId: order.id,
    reference: order.reference,
    status: order.status,
    outletId: order.outletId,
    items: order.items.map((item) => ({
        orderItemId: item.id,
        lineNo: item.lineNo,
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
    })),
});
