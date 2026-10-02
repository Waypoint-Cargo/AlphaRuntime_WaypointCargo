import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { syncBatchSchema } from "./sync.validator.js";
import { submitBatchController } from "./sync.controller.js";

const syncRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:sync:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Sync ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /sync/batch  (DRIVER, LOADER)  header: Idempotency-Key
syncRouter.post(
    "/batch",
    authenticateUser,
    limiter("batch", 60),
    requireRole(Role.DRIVER, Role.LOADER),
    validate(syncBatchSchema),
    catchAsync(submitBatchController),
);

export default syncRouter;
