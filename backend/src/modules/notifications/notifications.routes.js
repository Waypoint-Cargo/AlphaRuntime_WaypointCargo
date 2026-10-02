import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { listNotificationsSchema, markNotificationReadSchema } from "./notifications.validator.js";
import {
    getUnreadCountController,
    listNotificationsController,
    markAllNotificationsReadController,
    markNotificationReadController,
} from "./notifications.controller.js";

const notificationsRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:notifications:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Notifications ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /notifications?unread=true&page=&pageSize=
notificationsRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    validate(listNotificationsSchema),
    catchAsync(listNotificationsController),
);

// GET /notifications/unread-count
notificationsRouter.get(
    "/unread-count",
    authenticateUser,
    limiter("unread-count", 120),
    catchAsync(getUnreadCountController),
);

// POST /notifications/read-all
notificationsRouter.post(
    "/read-all",
    authenticateUser,
    limiter("read-all", 30),
    catchAsync(markAllNotificationsReadController),
);

// PATCH /notifications/:id/read
notificationsRouter.patch(
    "/:id/read",
    authenticateUser,
    limiter("read", 30),
    validate(markNotificationReadSchema),
    catchAsync(markNotificationReadController),
);

export default notificationsRouter;
