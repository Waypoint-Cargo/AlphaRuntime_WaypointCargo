import { Router } from "express";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { createAllocationController, unallocateController, validateAllocationController, vehicleOptionsController } from "./allocations.controller.js";
import { createAllocationSchema, unallocateSchema, validateAllocationSchema, vehicleOptionsSchema } from "./allocations.validator.js";

const allocationsRouter = Router();
const dispatcher = requireRole("DISPATCHER");

allocationsRouter.use(authenticateUser);
allocationsRouter.get("/vehicle-options", requireRole("DISPATCHER", "ADMIN"), validate(vehicleOptionsSchema), catchAsync(vehicleOptionsController));
allocationsRouter.post("/validate", dispatcher, validate(validateAllocationSchema), catchAsync(validateAllocationController));
allocationsRouter.post("/", dispatcher, validate(createAllocationSchema), catchAsync(createAllocationController));
allocationsRouter.delete("/:orderId", dispatcher, validate(unallocateSchema), catchAsync(unallocateController));

export default allocationsRouter;
