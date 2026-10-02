import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    approveUserSchema,
    changeUserScopeSchema,
    getUserSchema,
    listUsersSchema,
    setUserStatusSchema,
    updateMeSchema,
} from "./users.validator.js";
import {
    approveUserController,
    changeUserScopeController,
    getUserController,
    listUsersController,
    setUserStatusController,
    updateMeController,
} from "./users.controller.js";

const usersRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:users:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Users ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// PATCH /users/me  (any signed-in user) - declared before the /:id routes
usersRouter.patch(
    "/me",
    authenticateUser,
    limiter("update-me", 30),
    validate(updateMeSchema),
    catchAsync(updateMeController),
);

// GET /users  (ADMIN)
usersRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.ADMIN),
    validate(listUsersSchema),
    catchAsync(listUsersController),
);

// GET /users/:id  (ADMIN)
usersRouter.get(
    "/:id",
    authenticateUser,
    limiter("get", 120),
    requireRole(Role.ADMIN),
    validate(getUserSchema),
    catchAsync(getUserController),
);

// PATCH /users/:id/approve  (ADMIN)
usersRouter.patch(
    "/:id/approve",
    authenticateUser,
    limiter("approve", 30),
    requireRole(Role.ADMIN),
    validate(approveUserSchema),
    catchAsync(approveUserController),
);

// PATCH /users/:id/scope  (ADMIN)
usersRouter.patch(
    "/:id/scope",
    authenticateUser,
    limiter("scope", 30),
    requireRole(Role.ADMIN),
    validate(changeUserScopeSchema),
    catchAsync(changeUserScopeController),
);

// PATCH /users/:id/status  (ADMIN)
usersRouter.patch(
    "/:id/status",
    authenticateUser,
    limiter("status", 30),
    requireRole(Role.ADMIN),
    validate(setUserStatusSchema),
    catchAsync(setUserStatusController),
);

export default usersRouter;
