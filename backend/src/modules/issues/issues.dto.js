const labels = {
  MISSING_ITEM: "Missing item",
  DAMAGED_ITEM: "Damaged item",
  WRONG_ITEM: "Wrong item",
  QUANTITY_MISMATCH: "Quantity mismatch",
  QUANTITY_SHORT: "Quantity short",
  LATE_DELIVERY: "Late delivery",
  OUTLET_CLOSED: "Outlet closed",
  VEHICLE_PROBLEM: "Vehicle problem",
  TRAFFIC_DELAY: "Traffic delay",
  LOADING_SHORTFALL: "Loading shortfall",
  SYNC_CONFLICT: "Sync conflict",
  OTHER: "Other",
};
export const issueDTO = (i) => ({
  id: i.id,
  reference: i.reference,
  source: i.source,
  type: i.type,
  typeLabel: labels[i.type],
  status: i.status,
  order: i.order ? { id: i.order.id, reference: i.order.reference } : null,
  trip: i.trip ? { id: i.trip.id, code: i.trip.code } : null,
  stop: i.stop
    ? {
        id: i.stop.id,
        sequence: i.stop.sequence,
        outletName: i.stop.outlet?.name,
      }
    : null,
  item: i.orderItem
    ? {
        id: i.orderItem.id,
        itemName: i.orderItem.itemName,
        unit: i.orderItem.unit,
      }
    : null,
  expectedQty: i.expectedQty,
  actualQty: i.actualQty,
  description: i.description,
  photoFileIds: (i.photos ?? []).map((x) => x.fileId),
  reportedBy: i.reportedBy
    ? {
        id: i.reportedBy.id,
        fullName: i.reportedBy.fullName,
        role: i.reportedBy.role,
      }
    : null,
  reportedAtDevice: i.reportedAtDevice,
  resolvedBy: i.resolvedBy
    ? { id: i.resolvedBy.id, fullName: i.resolvedBy.fullName }
    : null,
  resolvedAt: i.resolvedAt,
  resolutionNote: i.resolutionNote,
  createdAt: i.createdAt,
  updatedAt: i.updatedAt,
});
