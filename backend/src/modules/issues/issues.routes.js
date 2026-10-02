import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { createIssueSchema, issueIdSchema, listIssuesSchema, updateIssueStatusSchema } from "./issues.validator.js";
import {
    createIssueController,
    getIssueController,
    listIssuesController,
    updateIssueStatusController,
} from "./issues.controller.js";

const issuesRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:issues:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Issues ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /issues  (LOADER, DRIVER, STORE_MANAGER, DISPATCHER)
issuesRouter.post(
    "/",
    authenticateUser,
    limiter("create", 30),
    requireRole(Role.LOADER, Role.DRIVER, Role.STORE_MANAGER, Role.DISPATCHER),
    validate(createIssueSchema),
    catchAsync(createIssueController),
);

// GET /issues?status&source&type&orderId&tripId&from&to&page&pageSize  (scoped to the caller)
issuesRouter.get("/", authenticateUser, limiter("list", 120), validate(listIssuesSchema), catchAsync(listIssuesController));

// GET /issues/:id
issuesRouter.get("/:id", authenticateUser, limiter("get", 120), validate(issueIdSchema), catchAsync(getIssueController));

// PATCH /issues/:id/status  (DISPATCHER of the issue's depot)
issuesRouter.patch(
    "/:id/status",
    authenticateUser,
    limiter("status", 30),
    requireRole(Role.DISPATCHER),
    validate(updateIssueStatusSchema),
    catchAsync(updateIssueStatusController),
);

export default issuesRouter;
