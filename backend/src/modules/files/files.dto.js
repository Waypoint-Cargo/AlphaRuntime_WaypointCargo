export const fileDTO = (f) => ({
  id: f.id,
  kind: f.kind,
  mimeType: f.mimeType,
  sizeBytes: f.sizeBytes,
  clientFileId: f.clientFileId,
  createdAt: f.createdAt,
});
