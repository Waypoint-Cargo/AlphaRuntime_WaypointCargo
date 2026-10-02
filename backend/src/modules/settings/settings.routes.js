import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { updateSettingSchema } from "./settings.validator.js";
import { listSettingsController, updateSettingController } from "./settings.controller.js";

const settingsRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:settings:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Settings ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /settings  (ADMIN, DISPATCHER)
settingsRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.ADMIN, Role.DISPATCHER),
    catchAsync(listSettingsController),
);

// PUT /settings/:key  (ADMIN)
settingsRouter.put(
    "/:key",
    authenticateUser,
    limiter("update", 30),
    requireRole(Role.ADMIN),
    validate(updateSettingSchema),
    catchAsync(updateSettingController),
);

export default settingsRouter;
