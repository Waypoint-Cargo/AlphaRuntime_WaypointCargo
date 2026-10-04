import { Router } from "express";
import {
  authenticateUser,
  requireRole,
} from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as v from "./issues.validator.js";
import * as c from "./issues.controller.js";
const r = Router();
r.use(authenticateUser);
r.post(
  "/",
  requireRole("LOADER", "DRIVER", "STORE_MANAGER", "DISPATCHER"),
  validate(v.createSchema),
  catchAsync(c.create),
);
r.get(
  "/",
  requireRole("LOADER", "DRIVER", "STORE_MANAGER", "DISPATCHER"),
  validate(v.listSchema),
  catchAsync(c.list),
);
r.get(
  "/:id",
  requireRole("LOADER", "DRIVER", "STORE_MANAGER", "DISPATCHER"),
  validate(v.idSchema),
  catchAsync(c.get),
);
r.patch(
  "/:id/status",
  requireRole("DISPATCHER"),
  validate(v.statusSchema),
  catchAsync(c.status),
);
export default r;
