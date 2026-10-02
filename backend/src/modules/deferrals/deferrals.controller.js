import { sendSuccess } from "../../utils/apiResponse.js";
import {
    createDeferralService,
    decideDeferralService,
    getDeferralService,
    getDeferralSummaryService,
    getOutletHistoryService,
    listDeferralsService,
    replanDeferralService,
} from "./deferrals.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    actorId: req.user.id,
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const createDeferralController = async (req, res) => {
    const { orderId, reason, note } = req.body;

    const result = await createDeferralService({ userId: req.user.id, orderId, reason, note, context: auditContext(req, res) });

    return sendSuccess(res, {
        statusCode: 201,
        message: reason ? "Order deferred." : "Deferral recorded; a decision is still needed.",
        data: result,
    });
};

export const decideDeferralController = async (req, res) => {
    const { reason, note } = req.body;

    const result = await decideDeferralService({ userId: req.user.id, id: req.params.id, reason, note, context: auditContext(req, res) });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order deferred.",
        data: result,
    });
};

export const replanDeferralController = async (req, res) => {
    const result = await replanDeferralService({ userId: req.user.id, id: req.params.id, context: auditContext(req, res) });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order is back in planning.",
        data: result,
    });
};

export const listDeferralsController = async (req, res) => {
    const { date, brand, status, q, page, pageSize } = req.query;

    const result = await listDeferralsService({ userId: req.user.id, date, brand, status, q, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Deferrals retrieved successfully.",
        data: result,
    });
};

export const deferralSummaryController = async (req, res) => {
    const result = await getDeferralSummaryService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Deferral summary retrieved successfully.",
        data: result,
    });
};

export const getDeferralController = async (req, res) => {
    const result = await getDeferralService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Deferral retrieved successfully.",
        data: result,
    });
};

export const outletHistoryController = async (req, res) => {
    const { page, pageSize } = req.query;

    const result = await getOutletHistoryService({ userId: req.user.id, outletId: req.params.outletId, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Outlet deferral history retrieved successfully.",
        data: result,
    });
};
