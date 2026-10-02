import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { capacitySchema, demandSchema, importForecastSchema } from "./forecast.validator.js";
import { getCapacityController, getDemandController, importForecastController } from "./forecast.controller.js";

const forecastRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:forecast:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Forecast ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /forecast/import  (ADMIN)
forecastRouter.post(
    "/import",
    authenticateUser,
    limiter("import", 30),
    requireRole(Role.ADMIN),
    validate(importForecastSchema),
    catchAsync(importForecastController),
);

// GET /forecast/demand?from&to&depotId&brand&tempClass&modelVersion  (DISPATCHER: own depots)
forecastRouter.get(
    "/demand",
    authenticateUser,
    limiter("demand", 120),
    requireRole(Role.DISPATCHER),
    validate(demandSchema),
    catchAsync(getDemandController),
);

// GET /forecast/capacity?weekStart&depotId  (DISPATCHER: own depots)
forecastRouter.get(
    "/capacity",
    authenticateUser,
    limiter("capacity", 120),
    requireRole(Role.DISPATCHER),
    validate(capacitySchema),
    catchAsync(getCapacityController),
);

export default forecastRouter;
