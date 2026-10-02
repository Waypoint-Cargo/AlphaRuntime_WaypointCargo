import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { config } from "../config/env.js";

// File storage on the local disk. Everything that knows where bytes live is here, so another
// backend (S3, MinIO) can replace this file without touching the files module.
//
// A storage key is 48 random hex characters. It is stored in File.storageKey and never sent to clients.

const KEY_PATTERN = /^[a-f0-9]{48}$/;

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const newStorageKey = () => randomBytes(24).toString("hex");

// <dir>/ab/<key>: two-character folders keep any single folder small
const pathOf = (storageKey) => {
    if (!KEY_PATTERN.test(storageKey)) throw new Error("Invalid storage key.");
    const root = path.resolve(config.fileStorageDir);
    const full = path.resolve(root, storageKey.slice(0, 2), storageKey);
    if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key.");
    return full;
};

export const putFile = async (storageKey, buffer) => {
    const full = pathOf(storageKey);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer, { flag: "wx" }); // never overwrite an existing file
};

// readable stream of the stored bytes (throws ENOENT when missing)
export const openFile = async (storageKey) => {
    const full = pathOf(storageKey);
    await stat(full);
    return createReadStream(full);
};

export const deleteFile = async (storageKey) => {
    await rm(pathOf(storageKey), { force: true });
};

// The real type of an image from its first bytes (the declared Content-Type is not trusted).
// Returns "image/jpeg", "image/png", "image/webp" or null.
export const detectImageType = (buffer) => {
    if (!buffer || buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
    return null;
};
