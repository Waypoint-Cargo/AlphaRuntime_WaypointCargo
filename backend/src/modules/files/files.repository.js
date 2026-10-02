import { getPrisma } from "../../config/database.js";

const fileSelect = {
    id: true,
    kind: true,
    mimeType: true,
    sizeBytes: true,
    sha256: true,
    clientFileId: true,
    uploadedById: true,
    createdAt: true,
};

const stopLink = { select: { outletId: true, trip: { select: { plan: { select: { depotId: true } } } } } };

// a file with everything needed to decide who may read it
const fileAccessSelect = {
    ...fileSelect,
    storageKey: true,
    podSignature: { select: { stop: stopLink } },
    podPhoto: { select: { pod: { select: { stop: stopLink } } } },
    issuePhoto: {
        select: {
            issue: {
                select: {
                    order: { select: { outletId: true, depotId: true } },
                    trip: { select: { plan: { select: { depotId: true } } } },
                    stop: stopLink,
                },
            },
        },
    },
};

export const findFileByClientFileId = async (clientFileId) => {
    return getPrisma().file.findUnique({ where: { clientFileId }, select: fileSelect });
};

export const findFileForAccess = async (id) => {
    return getPrisma().file.findUnique({ where: { id }, select: fileAccessSelect });
};

export const createFile = async (data) => {
    return getPrisma().file.create({ data, select: fileSelect });
};

// files by id with what they are attached to (a signature, a proof-of-delivery photo or an issue photo)
export const findFilesForAttachTx = (tx, ids) => {
    return tx.file.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            kind: true,
            uploadedById: true,
            podSignature: { select: { id: true } },
            podPhoto: { select: { fileId: true } },
            issuePhoto: { select: { fileId: true } },
        },
    });
};
