import { sendSuccess } from "../../utils/apiResponse.js";
import {
    closeOrdersService,
    getPlanQueueService,
    getPlanService,
    listPlansService,
    publishPlanService,
} from "./plans.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    actorId: req.user.id,
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const closeOrdersController = async (req, res) => {
    const { depotId, deliveryDate } = req.body;

    const result = await closeOrdersService({ userId: req.user.id, depotId, deliveryDate, context: auditContext(req, res) });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Orders are closed for planning.",
        data: result,
    });
};

export const listPlansController = async (req, res) => {
    const { depotId, deliveryDate, page, pageSize } = req.query;

    const result = await listPlansService({ userId: req.user.id, depotId, deliveryDate, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Plans retrieved successfully.",
        data: result,
    });
};

export const getPlanController = async (req, res) => {
    const result = await getPlanService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Plan retrieved successfully.",
        data: result,
    });
};

export const getPlanQueueController = async (req, res) => {
    const { filter, brand, tempClass, q } = req.query;

    const result = await getPlanQueueService({ userId: req.user.id, id: req.params.id, filter, brand, tempClass, q });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Plan queue retrieved successfully.",
        data: result,
    });
};

export const publishPlanController = async (req, res) => {
    const result = await publishPlanService({ userId: req.user.id, id: req.params.id, context: auditContext(req, res) });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Plan published successfully.",
        data: result,
    });
};
