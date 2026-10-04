import { Router } from "express";
import redis from "../../config/redis.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import logger from "../../config/logger.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { authenticateUser } from "../../middlewares/authenticate.js";
import { getProfileController, deleteOwnAccountController } from "./users.controller.js";

const usersRouter = Router();

const getProfileLimiter = createRateLimiter({
    redis,
    limit: 60,
    windowMs: 60_000,
    prefix: "users-profile",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "allow",
    onRedisError: (error) =>
        logger.warn("Users-profile rate limiter Redis error — failing open", {
            message: error.message,
        }),
});

const deleteOwnAccountLimiter = createRateLimiter({
    redis,
    limit: 5,
    windowMs: 60_000,
    prefix: "users-delete-self",
    errorMessage: "Too many delete attempts. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "block",
    onRedisError: (error) =>
        logger.warn("Users-delete-self rate limiter Redis error — blocking for safety", {
            message: error.message,
        }),
});

// GET /users/me — the caller's own full profile
usersRouter.get(
    "/me",
    authenticateUser,
    getProfileLimiter,
    catchAsync(getProfileController),
);

// DELETE /users/me — the caller deletes their own account
usersRouter.delete(
    "/me",
    authenticateUser,
    deleteOwnAccountLimiter,
    catchAsync(deleteOwnAccountController),
);

export default usersRouter;
