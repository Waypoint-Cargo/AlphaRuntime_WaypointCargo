import { sendSuccess } from "../../utils/apiResponse.js";
import {
    checkItem,
    completeLoading,
    getLoadingSummaryService,
    getLoadingTaskService,
    listLoadingTasksService,
    startLoadingService,
} from "./loading.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const getLoadingSummaryController = async (req, res) => {
    const result = await getLoadingSummaryService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Loading summary retrieved successfully.",
        data: result,
    });
};

export const listLoadingTasksController = async (req, res) => {
    const { date, brand, q, page, pageSize } = req.query;

    const result = await listLoadingTasksService({ userId: req.user.id, date, brand, q, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Loading tasks retrieved successfully.",
        data: result,
    });
};

export const getLoadingTaskController = async (req, res) => {
    const result = await getLoadingTaskService({ userId: req.user.id, tripId: req.params.tripId });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Loading task retrieved successfully.",
        data: result,
    });
};

export const startLoadingController = async (req, res) => {
    const result = await startLoadingService({ userId: req.user.id, tripId: req.params.tripId });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Loading started.",
        data: result,
    });
};

export const checkItemController = async (req, res) => {
    const { loadedQty, status, clientMutationId } = req.body;

    const result = await checkItem(req.user, {
        tripId: req.params.tripId,
        orderItemId: req.params.orderItemId,
        loadedQty,
        status,
        clientMutationId,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Item checked.",
        data: result,
    });
};

export const completeLoadingController = async (req, res) => {
    const result = await completeLoading(req.user, {
        tripId: req.params.tripId,
        departShort: req.body.departShort,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Loading completed.",
        data: result,
    });
};
