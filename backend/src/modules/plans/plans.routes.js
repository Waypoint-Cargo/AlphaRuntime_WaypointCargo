import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { closeOrdersSchema, listPlansSchema, planIdSchema, planQueueSchema } from "./plans.validator.js";
import {
    closeOrdersController,
    getPlanController,
    getPlanQueueController,
    listPlansController,
    publishPlanController,
} from "./plans.controller.js";

const plansRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:plans:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Plans ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /plans/close  (DISPATCHER)
plansRouter.post(
    "/close",
    authenticateUser,
    limiter("close", 30),
    requireRole(Role.DISPATCHER),
    validate(closeOrdersSchema),
    catchAsync(closeOrdersController),
);

// GET /plans?depotId&deliveryDate  (DISPATCHER own depots, ADMIN)
plansRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(listPlansSchema),
    catchAsync(listPlansController),
);

// GET /plans/:id
plansRouter.get(
    "/:id",
    authenticateUser,
    limiter("get", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(planIdSchema),
    catchAsync(getPlanController),
);

// GET /plans/:id/queue?filter=unplanned|planned|all&brand&tempClass&q
plansRouter.get(
    "/:id/queue",
    authenticateUser,
    limiter("queue", 120),
    requireRole(Role.DISPATCHER, Role.ADMIN),
    validate(planQueueSchema),
    catchAsync(getPlanQueueController),
);

// POST /plans/:id/publish  (DISPATCHER)
plansRouter.post(
    "/:id/publish",
    authenticateUser,
    limiter("publish", 30),
    requireRole(Role.DISPATCHER),
    validate(planIdSchema),
    catchAsync(publishPlanController),
);

export default plansRouter;
