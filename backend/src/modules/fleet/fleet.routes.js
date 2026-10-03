import { Router } from "express";
import redis from "../../config/redis.js";
import { createRateLimiter } from "../../middlewares/rateLimiter.js";
import logger from "../../config/logger.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
    authenticateUser,
    requireRole,
} from "../../middlewares/authenticate.js";
import { Role } from "../../generated/prisma/index.js";
import {
    createVehicleSchema,
    updateVehicleSchema,
    listVehiclesSchema,
    listByOperationalStateSchema,
    listCompatibleVehiclesSchema,
    getVehicleSchema,
    deleteVehicleSchema,
    updateVehicleStatusSchema,
    createFuelEntrySchema,
} from "./fleet.validator.js";
import {
    createVehicleController,
    listVehiclesController,
    fleetStatsController,
    listAvailableVehiclesController,
    listInRouteVehiclesController,
    listMaintenanceVehiclesController,
    listCompatibleVehiclesController,
    listDepotsController,
    getVehicleController,
    updateVehicleController,
    updateVehicleStatusController,
    createFuelEntryController,
    deleteVehicleController,
} from "./fleet.controller.js";

const fleetRouter = Router();

// Fleet management is a Dispatcher responsibility; Admin retained as a superuser override.
const fleetManagerOnly = [
    authenticateUser,
    requireRole(Role.DISPATCHER, Role.STORE_MANAGER, Role.ADMIN, Role.DRIVER),
];

const readLimiter = createRateLimiter({
    redis,
    limit: 120,
    windowMs: 60_000,
    prefix: "fleet-read",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "allow",
    onRedisError: (error) =>
        logger.warn("Fleet-read rate limiter Redis error — failing open", {
            message: error.message,
        }),
});

const writeLimiter = createRateLimiter({
    redis,
    limit: 30,
    windowMs: 60_000,
    prefix: "fleet-write",
    errorMessage: "Too many requests. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "block",
    onRedisError: (error) =>
        logger.warn(
            "Fleet-write rate limiter Redis error — blocking for safety",
            { message: error.message },
        ),
});

const deleteLimiter = createRateLimiter({
    redis,
    limit: 10,
    windowMs: 60_000,
    prefix: "fleet-delete",
    errorMessage: "Too many delete attempts. Try again later.",
    keyGenerator: (req) => req.user?.id ?? req.ip,
    fallbackBehavior: "block",
    onRedisError: (error) =>
        logger.warn(
            "Fleet-delete rate limiter Redis error — blocking for safety",
            { message: error.message },
        ),
});

// POST /vehicles — register a new vehicle
fleetRouter.post(
    "/",
    ...fleetManagerOnly,
    writeLimiter,
    validate(createVehicleSchema),
    catchAsync(createVehicleController),
);

// GET /vehicles — list + filter the fleet
fleetRouter.get(
    "/",
    ...fleetManagerOnly,
    readLimiter,
    validate(listVehiclesSchema),
    catchAsync(listVehiclesController),
);

// GET /vehicles/stats — fleet summary tiles
fleetRouter.get(
    "/stats",
    ...fleetManagerOnly,
    readLimiter,
    catchAsync(fleetStatsController),
);

// GET /vehicles/available — vehicles ready for assignment
fleetRouter.get(
    "/available",
    ...fleetManagerOnly,
    readLimiter,
    validate(listByOperationalStateSchema),
    catchAsync(listAvailableVehiclesController),
);

// GET /vehicles/in-route — vehicles assigned or currently delivering
fleetRouter.get(
    "/in-route",
    ...fleetManagerOnly,
    readLimiter,
    validate(listByOperationalStateSchema),
    catchAsync(listInRouteVehiclesController),
);

// GET /vehicles/maintenance — vehicles under service
fleetRouter.get(
    "/maintenance",
    ...fleetManagerOnly,
    readLimiter,
    validate(listByOperationalStateSchema),
    catchAsync(listMaintenanceVehiclesController),
);

// GET /vehicles/compatible — vehicles matching a temp/capacity/depot requirement
fleetRouter.get(
    "/compatible",
    ...fleetManagerOnly,
    readLimiter,
    validate(listCompatibleVehiclesSchema),
    catchAsync(listCompatibleVehiclesController),
);

// GET /vehicles/depots — home-depot picker
fleetRouter.get(
    "/depots",
    ...fleetManagerOnly,
    readLimiter,
    catchAsync(listDepotsController),
);

// GET /vehicles/:vehicleId — single vehicle detail
fleetRouter.get(
    "/:vehicleId",
    ...fleetManagerOnly,
    readLimiter,
    validate(getVehicleSchema),
    catchAsync(getVehicleController),
);

// PATCH /vehicles/:vehicleId — update vehicle details
fleetRouter.patch(
    "/:vehicleId",
    ...fleetManagerOnly,
    writeLimiter,
    validate(updateVehicleSchema),
    catchAsync(updateVehicleController),
);

// PATCH /vehicles/:vehicleId/status — change operational status
fleetRouter.patch(
    "/:vehicleId/status",
    ...fleetManagerOnly,
    writeLimiter,
    validate(updateVehicleStatusSchema),
    catchAsync(updateVehicleStatusController),
);

// POST /vehicles/:vehicleId/fuel-entries — log actual fuel usage
fleetRouter.post(
    "/:vehicleId/fuel-entries",
    ...fleetManagerOnly,
    writeLimiter,
    validate(createFuelEntrySchema),
    catchAsync(createFuelEntryController),
);

// DELETE /vehicles/:vehicleId — permanently remove a vehicle
fleetRouter.delete(
    "/:vehicleId",
    ...fleetManagerOnly,
    deleteLimiter,
    validate(deleteVehicleSchema),
    catchAsync(deleteVehicleController),
);

export default fleetRouter;
