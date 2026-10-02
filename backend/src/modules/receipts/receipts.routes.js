import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { confirmReceiptSchema, orderProofSchema } from "./receipts.validator.js";
import { confirmReceiptController, getOrderProofController } from "./receipts.controller.js";

const receiptsRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:receipts:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Receipts ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// POST /receipts/orders/:orderId  (STORE_MANAGER of the order's outlet)
receiptsRouter.post(
    "/orders/:orderId",
    authenticateUser,
    limiter("confirm", 30),
    requireRole(Role.STORE_MANAGER),
    validate(confirmReceiptSchema),
    catchAsync(confirmReceiptController),
);

// GET /receipts/orders/:orderId/proof  (STORE_MANAGER of the outlet, DISPATCHER of the depot)
receiptsRouter.get(
    "/orders/:orderId/proof",
    authenticateUser,
    limiter("proof", 120),
    requireRole(Role.STORE_MANAGER, Role.DISPATCHER),
    validate(orderProofSchema),
    catchAsync(getOrderProofController),
);

export default receiptsRouter;
