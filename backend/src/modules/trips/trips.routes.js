import { Router } from "express";
import {
  authenticateUser,
  requireRole,
} from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as v from "./trips.validator.js";
import * as c from "./trips.controller.js";
const r = Router();
r.use(authenticateUser);
r.patch(
  "/sequence-requests/:requestId",
  requireRole("DISPATCHER"),
  validate(v.decideSequenceSchema),
  catchAsync(c.decide),
);
r.get(
  "/",
  requireRole("DISPATCHER", "LOADER"),
  validate(v.listTripsSchema),
  catchAsync(c.list),
);
r.get(
  "/:id",
  requireRole("DISPATCHER", "LOADER", "DRIVER"),
  validate(v.tripIdSchema),
  catchAsync(c.get),
);
r.patch(
  "/:id/sequence",
  requireRole("DISPATCHER"),
  validate(v.reorderSchema),
  catchAsync(c.reorder),
);
r.patch(
  "/:id/driver",
  requireRole("DISPATCHER"),
  validate(v.driverSchema),
  catchAsync(c.driver),
);
r.post(
  "/:id/sequence-requests",
  requireRole("DRIVER"),
  validate(v.requestSequenceSchema),
  catchAsync(c.request),
);
r.get(
  "/:id/sequence-requests",
  requireRole("DISPATCHER", "DRIVER"),
  validate(v.tripIdSchema),
  catchAsync(c.requests),
);
export default r;
