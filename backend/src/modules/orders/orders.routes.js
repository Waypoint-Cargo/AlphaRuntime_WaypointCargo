import { Router } from "express";
import { authenticateUser, requireRole } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
	cancelOrderController, checksOrderController, confirmOrderController, createOrderController,
	deferOrderController, getOrderController, listOrdersController, submitOrderController,
	summaryOrdersController, updateOrderController,
} from "./orders.controller.js";
import { cancelOrderSchema, createOrderSchema, listOrdersSchema, orderIdSchema, updateOrderSchema } from "./orders.validator.js";

const ordersRouter = Router();
const storeManager = requireRole("STORE_MANAGER");
const scopedReaders = requireRole("STORE_MANAGER", "DISPATCHER", "ADMIN");

ordersRouter.use(authenticateUser);
ordersRouter.get("/summary", scopedReaders, validate(listOrdersSchema), catchAsync(summaryOrdersController));
ordersRouter.get("/", scopedReaders, validate(listOrdersSchema), catchAsync(listOrdersController));
ordersRouter.post("/", storeManager, validate(createOrderSchema), catchAsync(createOrderController));
ordersRouter.get("/:id", scopedReaders, validate(orderIdSchema), catchAsync(getOrderController));
ordersRouter.patch("/:id", storeManager, validate(updateOrderSchema), catchAsync(updateOrderController));
ordersRouter.post("/:id/submit", storeManager, validate(orderIdSchema), catchAsync(submitOrderController));
ordersRouter.get("/:id/checks", requireRole("STORE_MANAGER", "DISPATCHER"), validate(orderIdSchema), catchAsync(checksOrderController));
ordersRouter.post("/:id/confirm", storeManager, validate(orderIdSchema), catchAsync(confirmOrderController));
ordersRouter.post("/:id/cancel", storeManager, validate(cancelOrderSchema), catchAsync(cancelOrderController));
ordersRouter.post("/:id/defer", storeManager, validate(cancelOrderSchema), catchAsync(deferOrderController));

export default ordersRouter;
