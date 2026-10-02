import { Router } from "express";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { Role } from "../../generated/prisma/index.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { createEmployeeSchema, listEmployeesSchema, updateEmployeeSchema } from "./employees.validator.js";
import { createEmployeeController, listEmployeesController, updateEmployeeController } from "./employees.controller.js";

const employeesRouter = Router();

// one Redis-backed limiter per endpoint (keyed by user id, falling back to IP)
const limiter = (action, limit, windowMs = 60_000) =>
    createRateLimiter({
        redis,
        limit,
        windowMs,
        prefix: `rl:employees:${action}`,
        errorMessage: "Too many requests. Try again later.",
        keyGenerator: (req) => req.user?.id ?? req.ip,
        fallbackBehavior: "block",
        onRedisError: (error) => {
            logger.warn(`Employees ${action} rate limiter Redis error - blocking request for safety`, {
                message: error.message,
            });
        },
    });

// GET /employees?role&isActive&q&page&pageSize  (STORE_MANAGER: own outlet)
employeesRouter.get(
    "/",
    authenticateUser,
    limiter("list", 120),
    requireRole(Role.STORE_MANAGER),
    validate(listEmployeesSchema),
    catchAsync(listEmployeesController),
);

// POST /employees  (STORE_MANAGER: own outlet)
employeesRouter.post(
    "/",
    authenticateUser,
    limiter("create", 30),
    requireRole(Role.STORE_MANAGER),
    validate(createEmployeeSchema),
    catchAsync(createEmployeeController),
);

// PATCH /employees/:id  (STORE_MANAGER: own outlet)
employeesRouter.patch(
    "/:id",
    authenticateUser,
    limiter("update", 30),
    requireRole(Role.STORE_MANAGER),
    validate(updateEmployeeSchema),
    catchAsync(updateEmployeeController),
);

export default employeesRouter;
