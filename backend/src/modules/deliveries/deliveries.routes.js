import { Router } from "express";
import {
  authenticateUser,
  requireRole,
} from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as v from "./deliveries.validator.js";
import * as c from "./deliveries.controller.js";
const r = Router();
r.use(authenticateUser, requireRole("DRIVER"));
r.get("/today", validate(v.dateSchema), catchAsync(c.today));
r.get("/available", validate(v.dateSchema), catchAsync(c.available));
r.post("/tasks/:tripId/select", validate(v.selectSchema), catchAsync(c.select));
r.get("/summary", validate(v.dateSchema), catchAsync(c.summary));
r.post("/trips/:tripId/depart", validate(v.departSchema), catchAsync(c.depart));
r.post("/stops/:stopId/events", validate(v.eventSchema), catchAsync(c.event));
r.post("/stops/:stopId/proof", validate(v.proofSchema), catchAsync(c.proof));
export default r;
