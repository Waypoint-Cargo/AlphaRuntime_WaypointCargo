import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    checkItemSchema,
    completeLoadingSchema,
    listLoadingTasksSchema,
    loadingSummarySchema,
    loadingTripSchema,
} from "./loading.validator.js";
import {
    checkItemController,
    completeLoadingController,
    getLoadingSummaryController,
    getLoadingTaskController,
    listLoadingTasksController,
    startLoadingController,
} from "./loading.controller.js";

const loadingRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:loading:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Loading ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// every loading endpoint is for loaders, working on the trips of their own depots

// GET /loading/summary?date
loadingRouter.get(
    "/summary",
    authenticateUser,
    limiter("summary", 120),
    requireRole(Role.LOADER),
    validate(loadingSummarySchema),
    catchAsync(getLoadingSummaryController),
);

// GET /loading/tasks?date&brand&q&page&pageSize
loadingRouter.get(
    "/tasks",
    authenticateUser,
    limiter("tasks", 120),
    requireRole(Role.LOADER),
    validate(listLoadingTasksSchema),
    catchAsync(listLoadingTasksController),
);

// GET /loading/tasks/:tripId
loadingRouter.get(
    "/tasks/:tripId",
    authenticateUser,
    limiter("task", 120),
    requireRole(Role.LOADER),
    validate(loadingTripSchema),
    catchAsync(getLoadingTaskController),
);

// POST /loading/tasks/:tripId/start
loadingRouter.post(
    "/tasks/:tripId/start",
    authenticateUser,
    limiter("start", 30),
    requireRole(Role.LOADER),
    validate(loadingTripSchema),
    catchAsync(startLoadingController),
);

// PATCH /loading/tasks/:tripId/items/:orderItemId
loadingRouter.patch(
    "/tasks/:tripId/items/:orderItemId",
    authenticateUser,
    limiter("check-item", 30),
    requireRole(Role.LOADER),
    validate(checkItemSchema),
    catchAsync(checkItemController),
);

// POST /loading/tasks/:tripId/complete
loadingRouter.post(
    "/tasks/:tripId/complete",
    authenticateUser,
    limiter("complete", 30),
    requireRole(Role.LOADER),
    validate(completeLoadingSchema),
    catchAsync(completeLoadingController),
);

export default loadingRouter;
