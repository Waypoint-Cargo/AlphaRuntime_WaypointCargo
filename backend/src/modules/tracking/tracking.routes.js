import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { Role } from "../../generated/prisma/index.js";
import { createPingSchema, getTripHistorySchema } from "./tracking.validator.js";
import { recordPingController, getActiveTripsController, getTripHistoryController } from "./tracking.controller.js";

const trackingRouter = Router();

// Driver sends GPS pings
trackingRouter.post(
    "/ping",
    validate(createPingSchema),
    catchAsync(recordPingController)
);

// Dispatchers/Managers view active trips
trackingRouter.get(
    "/active-trips",
    catchAsync(getActiveTripsController)
);

// Dispatchers/Managers view specific trip history
trackingRouter.get(
    "/trips/:tripId/history",
    validate(getTripHistorySchema),
    catchAsync(getTripHistoryController)
);

export default trackingRouter;
