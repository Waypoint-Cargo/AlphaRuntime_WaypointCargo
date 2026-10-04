import { Router } from "express";
import redis from "../../config/redis.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import logger from "../../config/logger.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { Role } from "../../generated/prisma/index.js";
import {
    homeSummarySchema,
    listTasksSchema,
    listIssuesSchema,
    taskIdSchema,
    updateTaskLinesSchema,
    reportShortfallSchema,
    completeTaskSchema,
} from "./loading.validator.js";
import {
    getHomeSummaryController,
    listTasksController,
    listIssuesController,
    getTaskController,
    getTaskSummaryController,
    startTaskController,
    pauseTaskController,
    updateTaskLinesController,
    reportShortfallController,
    completeTaskController,
} from "./loading.controller.js";

const loadingRouter = Router();

// Every route below is for warehouse loaders only — identity first, then role.
const loaderOnly = [authenticateUser, requireRole(Role.LOADER)];

// The dispatcher can replan while a loader is on the screen, so no response here may be cached.
const noStore = (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
};

const readLimiter = createRateLimiter({
    redis,
    limit: 120,
    windowMs: 60_000,
    prefix: "loading-read",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "allow",
    onRedisError: (error) =>
        logger.warn("Loading-read rate limiter Redis error — failing open", {
            message: error.message,
        }),
});

// the +/- stepper can fire several saves a second while a vehicle is being loaded
const progressLimiter = createRateLimiter({
    redis,
    limit: 300,
    windowMs: 60_000,
    prefix: "loading-progress",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "block",
    onRedisError: (error) =>
        logger.warn("Loading-progress rate limiter Redis error — blocking for safety", {
            message: error.message,
        }),
});

// start / pause / shortfall / complete; start is also the lock heartbeat
const lifecycleLimiter = createRateLimiter({
    redis,
    limit: 60,
    windowMs: 60_000,
    prefix: "loading-lifecycle",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "block",
    onRedisError: (error) =>
        logger.warn("Loading-lifecycle rate limiter Redis error — blocking for safety", {
            message: error.message,
        }),
});

// GET /loading/summary — Home screen figures for one operating day
loadingRouter.get(
    "/summary",
    ...loaderOnly,
    readLimiter,
    noStore,
    validate(homeSummarySchema),
    catchAsync(getHomeSummaryController),
);

// GET /loading/issues — shortfall reports (Pending / Resolved tabs)
loadingRouter.get(
    "/issues",
    ...loaderOnly,
    readLimiter,
    noStore,
    validate(listIssuesSchema),
    catchAsync(listIssuesController),
);

// GET /loading/tasks — the shared task pool (Pending / Completed tabs, search, brand filter)
loadingRouter.get(
    "/tasks",
    ...loaderOnly,
    readLimiter,
    noStore,
    validate(listTasksSchema),
    catchAsync(listTasksController),
);

// GET /loading/tasks/:tripId — the live task
loadingRouter.get(
    "/tasks/:tripId",
    ...loaderOnly,
    readLimiter,
    noStore,
    validate(taskIdSchema),
    catchAsync(getTaskController),
);

// GET /loading/tasks/:tripId/summary — Review & Complete / Loading Completed
loadingRouter.get(
    "/tasks/:tripId/summary",
    ...loaderOnly,
    readLimiter,
    noStore,
    validate(taskIdSchema),
    catchAsync(getTaskSummaryController),
);

// POST /loading/tasks/:tripId/start — claim / resume the task, or extend the lock if it is already yours
loadingRouter.post(
    "/tasks/:tripId/start",
    ...loaderOnly,
    lifecycleLimiter,
    validate(taskIdSchema),
    catchAsync(startTaskController),
);

// POST /loading/tasks/:tripId/pause — release the task back to the shared pool
loadingRouter.post(
    "/tasks/:tripId/pause",
    ...loaderOnly,
    lifecycleLimiter,
    validate(taskIdSchema),
    catchAsync(pauseTaskController),
);

// PATCH /loading/tasks/:tripId/lines — save loaded quantities
loadingRouter.patch(
    "/tasks/:tripId/lines",
    ...loaderOnly,
    progressLimiter,
    validate(updateTaskLinesSchema),
    catchAsync(updateTaskLinesController),
);

// POST /loading/tasks/:tripId/shortfall — report missing / damaged items, put the load on hold
loadingRouter.post(
    "/tasks/:tripId/shortfall",
    ...loaderOnly,
    lifecycleLimiter,
    validate(reportShortfallSchema),
    catchAsync(reportShortfallController),
);

// POST /loading/tasks/:tripId/complete — finish loading, mark the vehicle ready for its driver
loadingRouter.post(
    "/tasks/:tripId/complete",
    ...loaderOnly,
    lifecycleLimiter,
    validate(completeTaskSchema),
    catchAsync(completeTaskController),
);

export default loadingRouter;
