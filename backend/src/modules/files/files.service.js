import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { AppError } from "../../utils/appError.js";
import * as repo from "./files.repository.js";
import { fileDTO } from "./files.dto.js";

// Local disk storage under backend/uploads (UPLOAD_DIR overrides it). The File row keeps the object key,
// so swapping this for S3/MinIO later only touches this file.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "uploads");
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // the File table checks the same limit
const EXT = { "image/png": "png", "image/jpeg": "jpg" };
const MAGIC = {
  "image/png": (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  "image/jpeg": (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
};
// which kinds each role may upload
const KINDS = {
  DRIVER: ["SIGNATURE", "POD_PHOTO", "ISSUE_PHOTO"],
  LOADER: ["ISSUE_PHOTO"],
  STORE_MANAGER: ["ISSUE_PHOTO"],
  DISPATCHER: ["ISSUE_PHOTO"],
};

export async function uploadFile(user, input) {
  if (!KINDS[user.role]?.includes(input.kind))
    throw new AppError("FILE_KIND_NOT_ALLOWED", 403);
  const old = await repo.findFileByClientFileId(input.clientFileId);
  if (old) {
    if (old.uploadedById !== user.id)
      throw new AppError("clientFileId already used", 409);
    return fileDTO(old);
  }
  const bytes = Buffer.from(input.dataBase64, "base64");
  if (!bytes.length) throw new AppError("The file is empty", 422);
  if (bytes.length > MAX_FILE_BYTES)
    throw new AppError("The file is larger than 5 MB", 413);
  if (!MAGIC[input.mimeType](bytes))
    throw new AppError("The file is not a valid image", 422);
  const storageKey = `${crypto.randomUUID()}.${EXT[input.mimeType]}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, storageKey), bytes);
  const file = await repo.createFile({
    storageKey,
    mimeType: input.mimeType,
    sizeBytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    kind: input.kind,
    uploadedById: user.id,
    clientFileId: input.clientFileId,
  });
  return fileDTO(file);
}

// The image bytes; only the uploader, dispatchers and store managers may read them.
export async function readFile(user, id) {
  const file = await repo.findFile(id);
  if (
    !file ||
    (file.uploadedById !== user.id &&
      !["DISPATCHER", "STORE_MANAGER"].includes(user.role))
  )
    throw new AppError("File not found", 404);
  try {
    return {
      mimeType: file.mimeType,
      bytes: await fs.readFile(path.join(UPLOAD_DIR, file.storageKey)),
    };
  } catch {
    throw new AppError("File not found", 404);
  }
}
