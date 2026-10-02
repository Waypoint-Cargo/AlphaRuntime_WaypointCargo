import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { singleFileUpload } from "../../utils/upload.js";
import { fileIdSchema, uploadFileSchema } from "./files.validator.js";
import { getFileController, uploadFileController } from "./files.controller.js";

const filesRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:files:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Files ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /files  multipart: file, kind, clientFileId?  (DRIVER, LOADER, STORE_MANAGER, DISPATCHER)
filesRouter.post(
    "/",
    authenticateUser,
    limiter("upload", 20),
    requireRole(Role.DRIVER, Role.LOADER, Role.STORE_MANAGER, Role.DISPATCHER),
    singleFileUpload("file"),
    validate(uploadFileSchema),
    catchAsync(uploadFileController),
);

// GET /files/:id  the image bytes (uploader, ADMIN, dispatcher of the depot, store manager of the outlet)
filesRouter.get("/:id", authenticateUser, limiter("get", 120), validate(fileIdSchema), catchAsync(getFileController));

export default filesRouter;
