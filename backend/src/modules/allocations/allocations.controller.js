import { sendSuccess } from "../../utils/apiResponse.js";
import { createAllocationService, getVehicleOptionsService, unallocateOrderService, validateAllocationService } from "./allocations.service.js";

const meta = (req, res) => ({ ip: req.ip, requestId: res.locals.requestId ?? null });

export const vehicleOptionsController = async (req, res) =>
	sendSuccess(res, { data: await getVehicleOptionsService({ actor: req.user, orderId: req.query.orderId, sort: req.query.sort }) });

export const validateAllocationController = async (req, res) =>
	sendSuccess(res, { data: await validateAllocationService({ actor: req.user, input: req.body }) });

export const createAllocationController = async (req, res) =>
	sendSuccess(res, { statusCode: 201, message: "Order allocated.", data: await createAllocationService({ actor: req.user, input: req.body, meta: meta(req, res) }) });

export const unallocateController = async (req, res) =>
	sendSuccess(res, { message: "Order removed from its trip.", data: await unallocateOrderService({ actor: req.user, orderId: req.params.orderId, reason: req.body?.reason, meta: meta(req, res) }) });
