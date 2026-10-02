import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    createDeferralSchema,
    decideDeferralSchema,
    deferralIdSchema,
    deferralSummarySchema,
    listDeferralsSchema,
    outletHistorySchema,
} from "./deferrals.validator.js";
import {
    createDeferralController,
    decideDeferralController,
    deferralSummaryController,
    getDeferralController,
    listDeferralsController,
    outletHistoryController,
    replanDeferralController,
} from "./deferrals.controller.js";

const deferralsRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:deferrals:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Deferrals ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /deferrals  (DISPATCHER)
deferralsRouter.post(
    "/",
    authenticateUser,
    limiter("create", 30),
    requireRole(Role.DISPATCHER),
    validate(createDeferralSchema),
    catchAsync(createDeferralController),
);

// GET /deferrals  (DISPATCHER own depots, ADMIN)
deferralsRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(listDeferralsSchema),
    catchAsync(listDeferralsController),
);

// GET /deferrals/summary?date=  - declared before /:id
deferralsRouter.get(
    "/summary",
    authenticateUser,
    limiter("summary", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(deferralSummarySchema),
    catchAsync(deferralSummaryController),
);

// GET /deferrals/outlets/:outletId/history  - declared before /:id
deferralsRouter.get(
    "/outlets/:outletId/history",
    authenticateUser,
    limiter("outlet-history", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(outletHistorySchema),
    catchAsync(outletHistoryController),
);

// GET /deferrals/:id
deferralsRouter.get(
    "/:id",
    authenticateUser,
    limiter("get", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(deferralIdSchema),
    catchAsync(getDeferralController),
);

// PATCH /deferrals/:id/decision  (DISPATCHER)
deferralsRouter.patch(
    "/:id/decision",
    authenticateUser,
    limiter("decision", 30),
    requireRole(Role.DISPATCHER),
    validate(decideDeferralSchema),
    catchAsync(decideDeferralController),
);

// POST /deferrals/:id/replan  (DISPATCHER)
deferralsRouter.post(
    "/:id/replan",
    authenticateUser,
    limiter("replan", 30),
    requireRole(Role.DISPATCHER),
    validate(deferralIdSchema),
    catchAsync(replanDeferralController),
);

export default deferralsRouter;
