import { Router } from "express";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as v from "./files.validator.js";
import * as c from "./files.controller.js";
const r = Router();
r.use(authenticateUser);
r.post(
  "/",
  requireRole("DRIVER", "LOADER", "STORE_MANAGER", "DISPATCHER"),
  validate(v.uploadSchema),
  catchAsync(c.upload),
);
r.get("/:id", validate(v.fileIdSchema), catchAsync(c.download));
export default r;
