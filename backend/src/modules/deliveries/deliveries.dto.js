const n = (v) => (v == null ? null : Number(v));
export const stopStateDTO = (s) => ({
  id: s.id,
  sequence: s.sequence,
  status: s.status,
  arrivedAt: s.arrivedAt,
  unloadingStartedAt: s.unloadingStartedAt,
  completedAt: s.completedAt,
  failureReason: s.failureReason,
});
export const proofDTO = (p) => ({
  id: p.id,
  receiverName: p.receiverName,
  capturedAt: p.capturedAtDevice,
  allDeliveredAsPlanned: p.allDeliveredAsPlanned,
  signatureFileId: p.signatureFileId,
  photoFileIds: (p.photos ?? []).map((x) => x.fileId),
  lines: (p.lines ?? []).map((x) => ({
    orderItemId: x.orderItemId,
    itemName: x.orderItem?.itemName,
    unit: x.orderItem?.unit,
    orderedQty: x.orderItem?.quantity,
    loadedQty: x.loadedQty,
    deliveredQty: x.deliveredQty,
  })),
});
export const num = n;
