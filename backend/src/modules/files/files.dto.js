// The storage key never leaves the server: clients only ever see the file id.
export const toFileDTO = (file) => ({
    id: file.id,
    kind: file.kind,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
    clientFileId: file.clientFileId ?? null,
    uploadedById: file.uploadedById,
    createdAt: file.createdAt,
});

// POST /files answers 201 for a new file and 200 when the same clientFileId was uploaded before
export const toUploadResultDTO = (file, { created }) => ({ file: toFileDTO(file), created });

// What a file is attached to, as the outlet and depots whose people may read it. A file that is not
// attached yet has no links: only its uploader can read it.
export const toFileLinksDTO = (file) => {
    const stop = file.podSignature?.stop ?? file.podPhoto?.pod.stop ?? null;
    const issue = file.issuePhoto?.issue ?? null;

    return {
        // a store manager reads proof of delivery of their outlet and issue photos on their outlet's orders
        outletId: stop?.outletId ?? issue?.order?.outletId ?? null,
        depotIds: [
            stop?.trip.plan.depotId,
            issue?.order?.depotId,
            issue?.trip?.plan.depotId,
            issue?.stop?.trip.plan.depotId,
        ].filter(Boolean),
    };
};

// the bytes of a file with the headers they are sent with
export const toFileDownloadDTO = ({ file, stream }) => ({
    stream,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
});
