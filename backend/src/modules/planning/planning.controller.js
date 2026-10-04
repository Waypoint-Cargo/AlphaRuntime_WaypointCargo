// Handles HTTP requests for dispatch plan generation, trip sequencing, stop allocations, and plan publishing.
import { sendSuccess } from "../../utils/apiResponse.js";
import { closePlanService, getPlanQueueService, getPlanService, listPlansService, publishPlanService } from "./planning.service.js";

const meta = (req, res) => ({ ip: req.ip, requestId: res.locals.requestId ?? null });

export const closePlanController = async (req, res) =>
	sendSuccess(res, { message: "Order queue closed.", data: await closePlanService({ actor: req.user, depotId: req.body.depotId, deliveryDate: req.body.deliveryDate, meta: meta(req, res) }) });

export const listPlansController = async (req, res) =>
	sendSuccess(res, { data: await listPlansService({ actor: req.user, filters: req.query }) });

export const getPlanController = async (req, res) =>
	sendSuccess(res, { data: await getPlanService({ actor: req.user, id: req.params.id }) });

export const planQueueController = async (req, res) => {
	const result = await getPlanQueueService({ actor: req.user, id: req.params.id, query: req.query });
	return sendSuccess(res, { data: { plan: result.plan, items: result.items }, meta: result.meta });
};

export const publishPlanController = async (req, res) =>
	sendSuccess(res, { message: "Plan published.", data: await publishPlanService({ actor: req.user, id: req.params.id, input: req.body, meta: meta(req, res) }) });
