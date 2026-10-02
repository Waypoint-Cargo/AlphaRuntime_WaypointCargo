import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    changeDriverSchema,
    changeSequenceSchema,
    createSequenceRequestSchema,
    decideSequenceRequestSchema,
    listSequenceRequestsSchema,
    listTripsSchema,
    tripIdSchema,
} from "./trips.validator.js";
import {
    changeDriverController,
    changeSequenceController,
    createSequenceRequestController,
    decideSequenceRequestController,
    getTripController,
    listSequenceRequestsController,
    listTripsController,
} from "./trips.controller.js";

const tripsRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:trips:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Trips ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /trips?deliveryDate&depotId | ?planId  (DISPATCHER, LOADER: own depots)
tripsRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.DISPATCHER, Role.LOADER),
    validate(listTripsSchema),
    catchAsync(listTripsController),
);

// PATCH /trips/sequence-requests/:requestId  (DISPATCHER) - declared before the /:id routes
tripsRouter.patch(
    "/sequence-requests/:requestId",
    authenticateUser,
    limiter("decide-request", 30),
    requireRole(Role.DISPATCHER),
    validate(decideSequenceRequestSchema),
    catchAsync(decideSequenceRequestController),
);

// GET /trips/:id  (DISPATCHER/LOADER for their depot, DRIVER for their own trip)
tripsRouter.get(
    "/:id",
    authenticateUser,
    limiter("get", 120),
    requireRole(Role.DISPATCHER, Role.LOADER, Role.DRIVER),
    validate(tripIdSchema),
    catchAsync(getTripController),
);

// PATCH /trips/:id/sequence  (DISPATCHER)
tripsRouter.patch(
    "/:id/sequence",
    authenticateUser,
    limiter("sequence", 30),
    requireRole(Role.DISPATCHER),
    validate(changeSequenceSchema),
    catchAsync(changeSequenceController),
);

// PATCH /trips/:id/driver  (DISPATCHER)
tripsRouter.patch(
    "/:id/driver",
    authenticateUser,
    limiter("driver", 30),
    requireRole(Role.DISPATCHER),
    validate(changeDriverSchema),
    catchAsync(changeDriverController),
);

// POST /trips/:id/sequence-requests  (DRIVER, own trip)
tripsRouter.post(
    "/:id/sequence-requests",
    authenticateUser,
    limiter("create-request", 30),
    requireRole(Role.DRIVER),
    validate(createSequenceRequestSchema),
    catchAsync(createSequenceRequestController),
);

// GET /trips/:id/sequence-requests  (DISPATCHER; DRIVER for their own trip)
tripsRouter.get(
    "/:id/sequence-requests",
    authenticateUser,
    limiter("list-requests", 120),
    requireRole(Role.DISPATCHER, Role.DRIVER),
    validate(listSequenceRequestsSchema),
    catchAsync(listSequenceRequestsController),
);

export default tripsRouter;
