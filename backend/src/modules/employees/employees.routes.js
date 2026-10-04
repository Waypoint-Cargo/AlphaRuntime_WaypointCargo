import { Router } from "express";
import redis from "../../config/redis.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import logger from "../../config/logger.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { Role } from "../../generated/prisma/index.js";
import {
    listEmployeesSchema,
    listPendingEmployeesSchema,
    listOutletsSchema,
    approveEmployeeSchema,
    deleteEmployeeSchema,
} from "./employees.validator.js";
import {
    listEmployeesController,
    listPendingEmployeesController,
    listOutletsController,
    approveEmployeeController,
    deleteEmployeeController,
} from "./employees.controller.js";

const employeesRouter = Router();

// Every route below is Store Manager only — identity first, then role.
const storeManagerOnly = [authenticateUser, requireRole(Role.STORE_MANAGER)];

const listEmployeesLimiter = createRateLimiter({
    redis,
    limit: 60,
    windowMs: 60_000,
    prefix: "employees-list",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "allow",
    onRedisError: (error) =>
        logger.warn("Employees-list rate limiter Redis error — failing open", {
            message: error.message,
        }),
});

const listPendingLimiter = createRateLimiter({
    redis,
    limit: 60,
    windowMs: 60_000,
    prefix: "employees-pending",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "allow",
    onRedisError: (error) =>
        logger.warn("Employees-pending rate limiter Redis error — failing open", {
            message: error.message,
        }),
});

const listOutletsLimiter = createRateLimiter({
    redis,
    limit: 60,
    windowMs: 60_000,
    prefix: "employees-outlets",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "allow",
    onRedisError: (error) =>
        logger.warn("Employees-outlets rate limiter Redis error — failing open", {
            message: error.message,
        }),
});

const approveEmployeeLimiter = createRateLimiter({
    redis,
    limit: 20,
    windowMs: 60_000,
    prefix: "employees-approve",
    errorMessage: "Too many approval attempts. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "block",
    onRedisError: (error) =>
        logger.warn("Employees-approve rate limiter Redis error — blocking for safety", {
            message: error.message,
        }),
});

const deleteEmployeeLimiter = createRateLimiter({
    redis,
    limit: 10,
    windowMs: 60_000,
    prefix: "employees-delete",
    errorMessage: "Too many delete attempts. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "block",
    onRedisError: (error) =>
        logger.warn("Employees-delete rate limiter Redis error — blocking for safety", {
            message: error.message,
        }),
});

// GET /employees — list all approved employees
employeesRouter.get(
    "/",
    ...storeManagerOnly,
    listEmployeesLimiter,
    validate(listEmployeesSchema),
    catchAsync(listEmployeesController),
);

// GET /employees/pending — list users awaiting approval
employeesRouter.get(
    "/pending",
    ...storeManagerOnly,
    listPendingLimiter,
    validate(listPendingEmployeesSchema),
    catchAsync(listPendingEmployeesController),
);

// GET /employees/outlets — outlets available to assign on approval (from outlets.csv)
employeesRouter.get(
    "/outlets",
    ...storeManagerOnly,
    listOutletsLimiter,
    validate(listOutletsSchema),
    catchAsync(listOutletsController),
);

// POST /employees/:userId/approve — assign employee number + outlet, email the employee
employeesRouter.post(
    "/:userId/approve",
    ...storeManagerOnly,
    approveEmployeeLimiter,
    validate(approveEmployeeSchema),
    catchAsync(approveEmployeeController),
);

// DELETE /employees/:userId — delete a user
employeesRouter.delete(
    "/:userId",
    ...storeManagerOnly,
    deleteEmployeeLimiter,
    validate(deleteEmployeeSchema),
    catchAsync(deleteEmployeeController),
);

export default employeesRouter;
