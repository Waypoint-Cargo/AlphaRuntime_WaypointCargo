import { createHash } from "node:crypto";
import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { deleteFile, detectImageType, newStorageKey, openFile, putFile } from "../../utils/fileStorage.js";
import * as usersService from "../users/users.service.js";
import { createFile, findFileByClientFileId, findFileForAccess, findFilesForAttachTx } from "./files.repository.js";
import { toFileDownloadDTO, toFileLinksDTO, toUploadResultDTO } from "./files.dto.js";

const sha256Of = (buffer) => createHash("sha256").update(buffer).digest("hex");

// The same clientFileId from the same uploader with the same content is a retry: answer with the file
// stored the first time. Anything else is a clash with a different upload.
const replayOrConflict = (existing, { userId, kind, sha256 }) => {
    if (existing.uploadedById !== userId || existing.kind !== kind || existing.sha256 !== sha256) {
        throw new AppError("This clientFileId was already used for a different file.", 409, [
            { field: "clientFileId", message: "Already in use.", code: "unique" },
        ]);
    }
    return toUploadResultDTO(existing, { created: false });
};

// ---- endpoints ----

export const uploadFileService = async ({ userId, kind, clientFileId, file }) => {
    if (!file) {
        throw new AppError("A file is required in the 'file' field.", 422, [
            { field: "file", message: "Required.", code: "required" },
        ]);
    }

    // the real type comes from the first bytes, not from the Content-Type the client declared
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) throw new AppError("Only JPEG, PNG and WEBP images are accepted.", 415);

    const sha256 = sha256Of(file.buffer);
    const identity = { userId, kind, sha256 };

    if (clientFileId) {
        const existing = await findFileByClientFileId(clientFileId);
        if (existing) return replayOrConflict(existing, identity);
    }

    const storageKey = newStorageKey();
    await putFile(storageKey, file.buffer);
    try {
        const created = await createFile({
            storageKey,
            mimeType,
            sizeBytes: file.size,
            sha256,
            kind,
            uploadedById: userId,
            clientFileId: clientFileId ?? null,
        });
        return toUploadResultDTO(created, { created: true });
    } catch (error) {
        await deleteFile(storageKey); // no row, so nothing may keep pointing at these bytes

        // two retries of the same upload at the same moment: the loser answers like a replay
        if (error?.code === "P2002" && clientFileId) {
            const existing = await findFileByClientFileId(clientFileId);
            if (existing) return replayOrConflict(existing, identity);
        }
        throw error;
    }
};

// The uploader, ADMIN, the dispatchers of the depot the file belongs to and the store manager of the
// outlet it belongs to may read a file. Anyone else gets 403.
const assertCanRead = (scope, file) => {
    if (scope.role === Role.ADMIN || file.uploadedById === scope.userId) return;

    const links = toFileLinksDTO(file);
    if (scope.role === Role.DISPATCHER && links.depotIds.some((depotId) => scope.depotIds.includes(depotId))) return;
    if (scope.role === Role.STORE_MANAGER && links.outletId && links.outletId === scope.outletId) return;

    throw new AppError("You do not have access to this file.", 403);
};

export const getFileService = async ({ userId, id }) => {
    const scope = await usersService.getScope(userId);

    const file = await findFileForAccess(id);
    if (!file) throw new AppError("File not found.", 404);
    assertCanRead(scope, file);

    let stream;
    try {
        stream = await openFile(file.storageKey);
    } catch (error) {
        if (error?.code === "ENOENT") throw new AppError("The file content is not available.", 404);
        throw error;
    }
    return toFileDownloadDTO({ file, stream });
};

// ---- used by other services ----

// Checks that every file exists, has the expected kind, was uploaded by this user and is not attached
// to a proof of delivery or an issue yet. Returns the de-duplicated ids; otherwise 422 with one entry
// per bad file. Call it inside the transaction that attaches the files.
export const assertAttachableTx = async (tx, { fileIds, kind, userId }) => {
    const ids = [...new Set(fileIds ?? [])];
    if (ids.length === 0) return [];

    const rows = new Map((await findFilesForAttachTx(tx, ids)).map((row) => [row.id, row]));

    const problems = [];
    for (const id of ids) {
        const row = rows.get(id);
        if (!row) problems.push({ fileId: id, message: "File not found.", code: "file_not_found" });
        else if (row.kind !== kind) problems.push({ fileId: id, message: `File is not a ${kind}.`, code: "file_wrong_kind" });
        else if (row.uploadedById !== userId) problems.push({ fileId: id, message: "File was uploaded by someone else.", code: "file_not_yours" });
        else if (row.podSignature || row.podPhoto || row.issuePhoto) {
            problems.push({ fileId: id, message: "File is already attached.", code: "file_already_attached" });
        }
    }
    if (problems.length > 0) throw new AppError("Some files cannot be attached.", 422, problems);

    return ids;
};
