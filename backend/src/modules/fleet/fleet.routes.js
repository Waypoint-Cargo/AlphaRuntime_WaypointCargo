import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    fleetSummarySchema,
    getVehicleSchema,
    listFleetSchema,
    myVehicleSchema,
    updateVehicleSchema,
} from "./fleet.validator.js";
import {
    fleetSummaryController,
    getVehicleController,
    listFleetController,
    myVehicleController,
    updateVehicleController,
} from "./fleet.controller.js";

const fleetRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:fleet:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Fleet ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /fleet  (DISPATCHER own depots, ADMIN all)
fleetRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(listFleetSchema),
    catchAsync(listFleetController),
);

// GET /fleet/summary?date=  (DISPATCHER)
fleetRouter.get(
    "/summary",
    authenticateUser,
    limiter("summary", 120),
    requireRole(Role.DISPATCHER),
    validate(fleetSummarySchema),
    catchAsync(fleetSummaryController),
);

// GET /fleet/my-vehicle  (DRIVER) - declared before /:id
fleetRouter.get(
    "/my-vehicle",
    authenticateUser,
    limiter("my-vehicle", 120),
    requireRole(Role.DRIVER),
    validate(myVehicleSchema),
    catchAsync(myVehicleController),
);

// GET /fleet/:id  (DISPATCHER, ADMIN; DRIVER only for the vehicle they drive)
fleetRouter.get(
    "/:id",
    authenticateUser,
    limiter("get", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN, Role.DRIVER),
    validate(getVehicleSchema),
    catchAsync(getVehicleController),
);

// PATCH /fleet/:id  (ADMIN)
fleetRouter.patch(
    "/:id",
    authenticateUser,
    limiter("update", 30),
    requireRole(Role.ADMIN),
    validate(updateVehicleSchema),
    catchAsync(updateVehicleController),
);

export default fleetRouter;
