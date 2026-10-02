import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { liveTrackingSchema, recordPingsSchema, tripTrackingSchema } from "./tracking.validator.js";
import {
    getLiveController,
    getOutletTrackingController,
    getTripTrackingController,
    recordPingsController,
} from "./tracking.controller.js";

const trackingRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:tracking:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Tracking ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /tracking/trips/:tripId/pings  (DRIVER, own trip, IN_TRANSIT)
trackingRouter.post(
    "/trips/:tripId/pings",
    authenticateUser,
    limiter("pings", 60),
    requireRole(Role.DRIVER),
    validate(recordPingsSchema),
    catchAsync(recordPingsController),
);

// GET /tracking/live?date  (DISPATCHER, own depots)
trackingRouter.get(
    "/live",
    authenticateUser,
    limiter("live", 120),
    requireRole(Role.DISPATCHER),
    validate(liveTrackingSchema),
    catchAsync(getLiveController),
);

// GET /tracking/outlet  (STORE_MANAGER: today's trips that visit the manager's outlet)
trackingRouter.get(
    "/outlet",
    authenticateUser,
    limiter("outlet", 120),
    requireRole(Role.STORE_MANAGER),
    catchAsync(getOutletTrackingController),
);

// GET /tracking/trips/:tripId  (DISPATCHER of the depot, DRIVER of the trip)
trackingRouter.get(
    "/trips/:tripId",
    authenticateUser,
    limiter("trip", 120),
    requireRole(Role.DISPATCHER, Role.DRIVER),
    validate(tripTrackingSchema),
    catchAsync(getTripTrackingController),
);

export default trackingRouter;
