import { Router } from "express";
import redis from "../../config/redis.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import logger from "../../config/logger.js";
import { validate } from "../../middlewares/validate.js";
import { changePasswordSchema, forgotPasswordSchema, googleSignInSchema, loginSchema, refreshTokenSchema, registerSchema, resetPasswordSchema } from "./auth.validator.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { changePasswordController, forgotPasswordController, getMeController, loginController, logoutAllController, logoutController, refreshController, registerController, resetPasswordController } from "./auth.controller.js";
import { authenticateUser } from "../../middlewares/authenticate.js";

const authRouter = Router();

// one Redis-backed limiter per endpoint; keyed by user id when signed in, otherwise by IP
const limiter = (action, { limit, windowMs = 60_000, errorMessage, keyGenerator = (req) => req.user?.id ?? req.ip }) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:auth:${action}`,
        errorMessage,
        keyGenerator,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(
                `Auth ${action} rate limiter Redis error - blocking request for safety`,
                {
                    message: error.message,
                },
            );
        },
    });

const loginLimiter = limiter("login", {
    limit: 5,
    errorMessage: "Too many login attempts. Try again later.",
});

const refreshLimiter = limiter("refresh", {
    limit: 10,
    errorMessage: "Too many token refresh attempts. Try again later.",
});

const registerLimiter = limiter("register", {
    limit: 5,
    errorMessage: "Too many register attempts. Try again later.",
});

const logoutLimiter = limiter("logout", {
    limit: 20,
    errorMessage: "Too many logout attempts. Try again later.",
});

const logoutAllLimiter = limiter("logout-all", {
    limit: 5,
    errorMessage: "Too many logout-all attempts. Try again later.",
});

// keyed by the (validated, lower-cased) e-mail so one mailbox cannot be flooded;
// the route runs validate() first so the key is never raw client input
const forgotPasswordLimiter = limiter("forgot-password", {
    limit: 3,
    windowMs: 15 * 60 * 1000,
    errorMessage: "Too many password reset requests. Please try again later.",
    keyGenerator: (req) => req.body?.email ?? req.ip,
});

const resetPasswordLimiter = limiter("reset-password", {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    errorMessage: "Too many password reset attempts. Please try again later.",
    keyGenerator: (req) => req.ip,
});

// stricter than the usual 30/min write limit: the endpoint checks the current password
const changePasswordLimiter = limiter("change-password", {
    limit: 5,
    errorMessage: "Too many password change attempts. Try again later.",
});

const meLimiter = limiter("me", {
    limit: 120,
    errorMessage: "Too many requests. Try again later.",
});


// POST /auth/login
authRouter.post("/login", loginLimiter, validate(loginSchema), catchAsync(loginController));

// POST /auth/register
authRouter.post("/register", registerLimiter, validate(registerSchema), catchAsync(registerController));

// POST /auth/refresh
authRouter.post("/refresh", refreshLimiter, validate(refreshTokenSchema), catchAsync(refreshController));

// POST /auth/logout
authRouter.post("/logout", logoutLimiter, validate(refreshTokenSchema), catchAsync(logoutController));

// POST /auth/logout-all  — requires a valid access token
authRouter.post('/logout-all',
    authenticateUser,
    logoutAllLimiter,
    catchAsync(logoutAllController),
);

// POST /auth/forgot-password
authRouter.post('/forgot-password',
    validate(forgotPasswordSchema),
    forgotPasswordLimiter,
    catchAsync(forgotPasswordController),
);

// POST /auth/reset-password
authRouter.post('/reset-password',
    resetPasswordLimiter,
    validate(resetPasswordSchema),
    catchAsync(resetPasswordController),
);

// POST /auth/change-password  — requires a valid access token
authRouter.post('/change-password',
    authenticateUser,
    changePasswordLimiter,
    validate(changePasswordSchema),
    catchAsync(changePasswordController),
);

// GET /auth/me  — requires a valid access token
authRouter.get('/me',
    authenticateUser,
    meLimiter,
    catchAsync(getMeController),
);

export default authRouter;
