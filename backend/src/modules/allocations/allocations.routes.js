import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { allocateSchema, unallocateSchema, validateAllocationSchema, vehicleOptionsSchema } from "./allocations.validator.js";
import {
    allocateController,
    unallocateController,
    validateAllocationController,
    vehicleOptionsController,
} from "./allocations.controller.js";

const allocationsRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:allocations:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Allocations ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /allocations/vehicle-options?orderId=&sort=recommended|capacity  (DISPATCHER)
allocationsRouter.get(
    "/vehicle-options",
    authenticateUser,
    limiter("vehicle-options", 120),
    requireRole(Role.DISPATCHER),
    validate(vehicleOptionsSchema),
    catchAsync(vehicleOptionsController),
);

// POST /allocations/validate  (DISPATCHER) - checks only, writes nothing
allocationsRouter.post(
    "/validate",
    authenticateUser,
    limiter("validate", 120),
    requireRole(Role.DISPATCHER),
    validate(validateAllocationSchema),
    catchAsync(validateAllocationController),
);

// POST /allocations  (DISPATCHER)
allocationsRouter.post(
    "/",
    authenticateUser,
    limiter("allocate", 30),
    requireRole(Role.DISPATCHER),
    validate(allocateSchema),
    catchAsync(allocateController),
);

// DELETE /allocations/:orderId  (DISPATCHER)
allocationsRouter.delete(
    "/:orderId",
    authenticateUser,
    limiter("unallocate", 30),
    requireRole(Role.DISPATCHER),
    validate(unallocateSchema),
    catchAsync(unallocateController),
);

export default allocationsRouter;
