import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { dispatcherDashboardSchema, loaderDashboardSchema, storeManagerDashboardSchema } from "./dashboards.validator.js";
import {
    getDispatcherDashboardController,
    getLoaderDashboardController,
    getStoreManagerDashboardController,
} from "./dashboards.controller.js";

const dashboardsRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:dashboards:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Dashboards ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /dashboards/dispatcher?date&depotId  (DISPATCHER: own depots)
dashboardsRouter.get(
    "/dispatcher",
    authenticateUser,
    limiter("dispatcher", 120),
    requireRole(Role.DISPATCHER),
    validate(dispatcherDashboardSchema),
    catchAsync(getDispatcherDashboardController),
);

// GET /dashboards/store-manager?date  (STORE_MANAGER)
dashboardsRouter.get(
    "/store-manager",
    authenticateUser,
    limiter("store-manager", 120),
    requireRole(Role.STORE_MANAGER),
    validate(storeManagerDashboardSchema),
    catchAsync(getStoreManagerDashboardController),
);

// GET /dashboards/loader?date  (LOADER)
dashboardsRouter.get(
    "/loader",
    authenticateUser,
    limiter("loader", 120),
    requireRole(Role.LOADER),
    validate(loaderDashboardSchema),
    catchAsync(getLoaderDashboardController),
);

export default dashboardsRouter;
