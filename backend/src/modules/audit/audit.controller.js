import { sendSuccess } from "../../utils/apiResponse.js";
import { listAuditLogsService } from "./audit.service.js";

export const listAuditLogsController = async (req, res) => {
    const { entityType, entityId, actorId, action, from, to, page, pageSize } = req.query;

    const result = await listAuditLogsService({ entityType, entityId, actorId, action, from, to, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Audit log retrieved successfully.",
        data: result,
    });
};
