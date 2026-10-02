import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    cancelOrderSchema,
    createOrderSchema,
    listOrdersSchema,
    orderIdSchema,
    ordersSummarySchema,
    updateOrderSchema,
} from "./orders.validator.js";
import {
    cancelOrderController,
    confirmOrderController,
    createOrderController,
    getOrderChecksController,
    getOrderController,
    listOrdersController,
    ordersSummaryController,
    submitOrderController,
    updateOrderController,
} from "./orders.controller.js";

const ordersRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:orders:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Orders ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /orders  (STORE_MANAGER)
ordersRouter.post(
    "/",
    authenticateUser,
    limiter("create", 30),
    requireRole(Role.STORE_MANAGER),
    validate(createOrderSchema),
    catchAsync(createOrderController),
);

// GET /orders  (STORE_MANAGER own outlet, DISPATCHER own depots, ADMIN)
ordersRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER, Role.ADMIN),
    validate(listOrdersSchema),
    catchAsync(listOrdersController),
);

// GET /orders/summary?deliveryDate=  (same scope) - declared before /:id
ordersRouter.get(
    "/summary",
    authenticateUser,
    limiter("summary", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER, Role.ADMIN),
    validate(ordersSummarySchema),
    catchAsync(ordersSummaryController),
);

// GET /orders/:id/checks  (STORE_MANAGER own outlet, DISPATCHER own depots)
ordersRouter.get(
    "/:id/checks",
    authenticateUser,
    limiter("checks", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER),
    validate(orderIdSchema),
    catchAsync(getOrderChecksController),
);

// GET /orders/:id  (same scope as the list)
ordersRouter.get(
    "/:id",
    authenticateUser,
    limiter("get", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER, Role.ADMIN),
    validate(orderIdSchema),
    catchAsync(getOrderController),
);

// PATCH /orders/:id  (STORE_MANAGER, DRAFT or PENDING_REVIEW only)
ordersRouter.patch(
    "/:id",
    authenticateUser,
    limiter("update", 30),
    requireRole(Role.STORE_MANAGER),
    validate(updateOrderSchema),
    catchAsync(updateOrderController),
);

// POST /orders/:id/submit  (STORE_MANAGER)
ordersRouter.post(
    "/:id/submit",
    authenticateUser,
    limiter("submit", 30),
    requireRole(Role.STORE_MANAGER),
    validate(orderIdSchema),
    catchAsync(submitOrderController),
);

// POST /orders/:id/confirm  (STORE_MANAGER)
ordersRouter.post(
    "/:id/confirm",
    authenticateUser,
    limiter("confirm", 30),
    requireRole(Role.STORE_MANAGER),
    validate(orderIdSchema),
    catchAsync(confirmOrderController),
);

// POST /orders/:id/cancel  (STORE_MANAGER)
ordersRouter.post(
    "/:id/cancel",
    authenticateUser,
    limiter("cancel", 30),
    requireRole(Role.STORE_MANAGER),
    validate(cancelOrderSchema),
    catchAsync(cancelOrderController),
);

export default ordersRouter;
