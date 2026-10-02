import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    getCutoffSchema,
    getOutletSchema,
    listCalendarSchema,
    listOutletsSchema,
} from "./reference.validator.js";
import {
    getCutoffController,
    getOutletController,
    listCalendarController,
    listDepotsController,
    listOutletsController,
} from "./reference.controller.js";

const referenceRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:reference:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Reference ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /reference/depots  (all signed-in roles)
referenceRouter.get(
    "/depots",
    authenticateUser,
    limiter("depots", 120),
    catchAsync(listDepotsController),
);

// GET /reference/outlets  (STORE_MANAGER own outlet, DISPATCHER/LOADER own depots, ADMIN all)
referenceRouter.get(
    "/outlets",
    authenticateUser,
    limiter("outlets", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER, Role.LOADER, Role.ADMIN),
    validate(listOutletsSchema),
    catchAsync(listOutletsController),
);

// GET /reference/outlets/:id  (same scope)
referenceRouter.get(
    "/outlets/:id",
    authenticateUser,
    limiter("outlet", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER, Role.LOADER, Role.ADMIN),
    validate(getOutletSchema),
    catchAsync(getOutletController),
);

// GET /reference/calendar?from&to  (all signed-in roles, at most 92 days)
referenceRouter.get(
    "/calendar",
    authenticateUser,
    limiter("calendar", 120),
    validate(listCalendarSchema),
    catchAsync(listCalendarController),
);

// GET /reference/cutoff?deliveryDate=  (STORE_MANAGER, DISPATCHER)
referenceRouter.get(
    "/cutoff",
    authenticateUser,
    limiter("cutoff", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER),
    validate(getCutoffSchema),
    catchAsync(getCutoffController),
);

export default referenceRouter;
