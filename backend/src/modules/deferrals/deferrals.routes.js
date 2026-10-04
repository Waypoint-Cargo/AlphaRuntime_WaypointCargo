import { Router } from "express";
import {
  authenticateUser,
  requireRole,
} from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as v from "./deferrals.validator.js";
import * as c from "./deferrals.controller.js";
const r = Router();
r.use(authenticateUser, requireRole("DISPATCHER"));
r.get("/summary", validate(v.summarySchema), catchAsync(c.summary));
r.get(
  "/outlets/:outletId/history",
  validate(v.historySchema),
  catchAsync(c.history),
);
r.post("/", validate(v.createSchema), catchAsync(c.create));
r.get("/", validate(v.listSchema), catchAsync(c.list));
r.get("/:id", validate(v.idSchema), catchAsync(c.get));
r.patch("/:id/decision", validate(v.decisionSchema), catchAsync(c.decide));
r.post("/:id/replan", validate(v.idSchema), catchAsync(c.replan));
export default r;
