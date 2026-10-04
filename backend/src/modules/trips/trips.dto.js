const n = (v) => (v == null ? null : Number(v));
const ymd = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);
const windowOf = (o) => ({
  startMin: o.windowStartMin,
  endMin: o.windowEndMin,
  start:
    o.windowStartMin == null
      ? null
      : `${String(Math.floor(o.windowStartMin / 60)).padStart(2, "0")}:${String(o.windowStartMin % 60).padStart(2, "0")}`,
  end:
    o.windowEndMin == null
      ? null
      : `${String(Math.floor(o.windowEndMin / 60)).padStart(2, "0")}:${String(o.windowEndMin % 60).padStart(2, "0")}`,
});
export const tripSummaryDTO = (t) => ({
  id: t.id,
  code: t.code,
  planId: t.planId,
  deliveryDate: ymd(t.deliveryDate),
  tripNumber: t.tripNumber,
  status: t.status,
  vehicle: t.vehicle
    ? {
        id: t.vehicle.id,
        code: t.vehicle.code,
        type: t.vehicle.type,
        isRefrigerated: t.vehicle.isRefrigerated,
        maxWeightKg: n(t.vehicle.maxWeightKg),
        maxVolumeM3: n(t.vehicle.maxVolumeM3),
      }
    : null,
  driver: t.driver
    ? { id: t.driver.id, fullName: t.driver.fullName, phone: t.driver.phone }
    : null,
  stopCount: t._count?.stops ?? t.stops?.length ?? 0,
  orderCount:
    t.stops?.reduce((s, x) => s + (x.allocations?.length ?? 0), 0) ?? 0,
  planned: {
    weightKg: n(t.plannedWeightKg),
    volumeM3: n(t.plannedVolumeM3),
    distanceKm: n(t.plannedDistanceKm),
    fuelL: n(t.plannedFuelL),
    weightUsePct: t.vehicle?.maxWeightKg
      ? +((100 * n(t.plannedWeightKg)) / n(t.vehicle.maxWeightKg)).toFixed(1)
      : null,
    volumeUsePct: t.vehicle?.maxVolumeM3
      ? +((100 * n(t.plannedVolumeM3)) / n(t.vehicle.maxVolumeM3)).toFixed(1)
      : null,
  },
  actualDeparture: t.actualDeparture,
});
export const tripDetailDTO = (t) => ({
  ...tripSummaryDTO(t),
  stops: (t.stops ?? []).map((s) => ({
    id: s.id,
    sequence: s.sequence,
    status: s.status,
    outlet: {
      id: s.outlet.id,
      code: s.outlet.code,
      name: s.outlet.name,
      district: s.outlet.district,
      address: s.outlet.address,
      lat: n(s.outlet.lat),
      lng: n(s.outlet.lng),
      phone: s.outlet.phone,
      effectiveWindow: windowOf(s.outlet),
      unloadingType: s.outlet.unloadingType,
      unloadingNotes: s.outlet.unloadingNotes,
    },
    orders: (s.allocations ?? []).map((a) => ({
      id: a.order.id,
      reference: a.order.reference,
      tempClass: a.order.tempClass,
      totalWeightKg: n(a.order.totalWeightKg),
      totalVolumeM3: n(a.order.totalVolumeM3),
      itemCount: a.order.itemCount,
      isFragile: a.order.isFragile,
      isHighValue: a.order.isHighValue,
    })),
    predictedArrival: s.predictedArrival,
    legDistanceKm: n(s.legDistanceKm),
    arrivedAt: s.arrivedAt,
    completedAt: s.completedAt,
  })),
});
export const sequenceRequestDTO = (r) => ({
  id: r.id,
  tripId: r.tripId,
  proposedStopIds: r.proposedSequence,
  reason: r.reason,
  status: r.status,
  requestedBy: r.requestedBy
    ? { id: r.requestedBy.id, fullName: r.requestedBy.fullName }
    : null,
  decidedBy: r.decidedBy
    ? { id: r.decidedBy.id, fullName: r.decidedBy.fullName }
    : null,
  decidedAt: r.decidedAt,
  createdAt: r.createdAt,
});
