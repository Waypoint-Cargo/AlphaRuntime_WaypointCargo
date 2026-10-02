import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { departSchema, deliveriesSummarySchema, proofSchema, stopEventSchema, todaySchema } from "./deliveries.validator.js";
import {
    departController,
    getDeliveriesSummaryController,
    getTodayController,
    recordStopEventController,
    submitProofController,
} from "./deliveries.controller.js";

const deliveriesRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:deliveries:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Deliveries ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// every delivery endpoint is for drivers, working on their own trips

// GET /deliveries/today?date  the route bundle
deliveriesRouter.get(
    "/today",
    authenticateUser,
    limiter("today", 120),
    requireRole(Role.DRIVER),
    validate(todaySchema),
    catchAsync(getTodayController),
);

// GET /deliveries/summary?date
deliveriesRouter.get(
    "/summary",
    authenticateUser,
    limiter("summary", 120),
    requireRole(Role.DRIVER),
    validate(deliveriesSummarySchema),
    catchAsync(getDeliveriesSummaryController),
);

// POST /deliveries/trips/:tripId/depart
deliveriesRouter.post(
    "/trips/:tripId/depart",
    authenticateUser,
    limiter("depart", 30),
    requireRole(Role.DRIVER),
    validate(departSchema),
    catchAsync(departController),
);

// POST /deliveries/stops/:stopId/events
deliveriesRouter.post(
    "/stops/:stopId/events",
    authenticateUser,
    limiter("event", 30),
    requireRole(Role.DRIVER),
    validate(stopEventSchema),
    catchAsync(recordStopEventController),
);

// POST /deliveries/stops/:stopId/proof
deliveriesRouter.post(
    "/stops/:stopId/proof",
    authenticateUser,
    limiter("proof", 30),
    requireRole(Role.DRIVER),
    validate(proofSchema),
    catchAsync(submitProofController),
);

export default deliveriesRouter;
