// Defines API routes, dispatcher authorization, and validation middlewares for dispatch planning operations.
import { Router } from "express";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { closePlanController, getPlanController, listPlansController, planQueueController, publishPlanController } from "./planning.controller.js";
import { closePlanSchema, listPlansSchema, planIdSchema, planQueueSchema, publishPlanSchema } from "./planning.validator.js";

const planningRouter = Router();
const dispatcher = requireRole("DISPATCHER");
const readers = requireRole("DISPATCHER", "ADMIN");

planningRouter.use(authenticateUser);
planningRouter.get("/", readers, validate(listPlansSchema), catchAsync(listPlansController));
planningRouter.post("/close", dispatcher, validate(closePlanSchema), catchAsync(closePlanController)); // before "/:id"
planningRouter.get("/:id", readers, validate(planIdSchema), catchAsync(getPlanController));
planningRouter.get("/:id/queue", readers, validate(planQueueSchema), catchAsync(planQueueController));
planningRouter.post("/:id/publish", dispatcher, validate(publishPlanSchema), catchAsync(publishPlanController));

export default planningRouter;
