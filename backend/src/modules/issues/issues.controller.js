import { sendSuccess } from "../../utils/apiResponse.js";
import {
    createIssueService,
    getIssueService,
    listIssuesService,
    updateIssueStatusService,
} from "./issues.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    actorId: req.user.id,
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const createIssueController = async (req, res) => {
    const { issue, created } = await createIssueService({ userId: req.user.id, input: req.body });

    return sendSuccess(res, {
        statusCode: created ? 201 : 200,
        message: created ? "Issue reported successfully." : "Issue was already reported.",
        data: issue,
    });
};

export const listIssuesController = async (req, res) => {
    const { status, source, type, orderId, tripId, from, to, page, pageSize } = req.query;

    const result = await listIssuesService({
        userId: req.user.id,
        status,
        source,
        type,
        orderId,
        tripId,
        from,
        to,
        page,
        pageSize,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Issues retrieved successfully.",
        data: result,
    });
};

export const getIssueController = async (req, res) => {
    const result = await getIssueService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Issue retrieved successfully.",
        data: result,
    });
};

export const updateIssueStatusController = async (req, res) => {
    const { status, resolutionNote } = req.body;

    const result = await updateIssueStatusService({
        userId: req.user.id,
        id: req.params.id,
        status,
        resolutionNote,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Issue status updated successfully.",
        data: result,
    });
};
