const labels = {
  CAPACITY_UNAVAILABLE: "Capacity unavailable",
  DELIVERY_WINDOW_CONFLICT: "Delivery window conflict",
  VEHICLE_RESTRICTION: "Vehicle restriction",
  FUEL_LIMITATION: "Fuel limitation",
  LOADING_SHORTFALL: "Loading shortfall",
  OTHER: "Other",
};
const n = (v) => (v == null ? null : Number(v)),
  ymd = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);
export const deferralDTO = (d) => ({
  id: d.id,
  order: d.order
    ? {
        id: d.order.id,
        reference: d.order.reference,
        brand: d.order.brand,
        tempClass: d.order.tempClass,
        totalWeightKg: n(d.order.totalWeightKg),
        totalVolumeM3: n(d.order.totalVolumeM3),
        status: d.order.status,
      }
    : null,
  outlet: d.outlet
    ? {
        id: d.outlet.id,
        code: d.outlet.code,
        name: d.outlet.name,
        district: d.outlet.district,
      }
    : null,
  fromDate: ymd(d.fromDate),
  toDate: ymd(d.toDate),
  status: d.status,
  reason: d.reason,
  reasonLabel: d.reason ? labels[d.reason] : null,
  note: d.note,
  detectedConflicts: d.detectedConflicts ?? [],
  consecutiveCount: d.consecutiveCount,
  decidedBy: d.decidedBy
    ? { id: d.decidedBy.id, fullName: d.decidedBy.fullName }
    : null,
  decidedAt: d.decidedAt,
  createdAt: d.createdAt,
});
export const reasonText = (r) =>
  ({
    CAPACITY_UNAVAILABLE: "There was not enough delivery capacity on this run.",
    DELIVERY_WINDOW_CONFLICT:
      "We could not reach your outlet within its delivery window.",
    VEHICLE_RESTRICTION:
      "No suitable vehicle was available for your outlet's access needs.",
    FUEL_LIMITATION:
      "This week's fuel allowance for the available vehicles was used up.",
    LOADING_SHORTFALL: "Some goods could not be loaded for this run.",
    OTHER: "The dispatcher rescheduled this delivery.",
  })[r];
