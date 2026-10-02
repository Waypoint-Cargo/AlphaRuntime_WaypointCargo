import { sendSuccess } from "../../utils/apiResponse.js";
import { getCapacityService, getDemandService, importForecastService } from "./forecast.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    actorId: req.user.id,
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const importForecastController = async (req, res) => {
    const { modelVersion, generatedAt, rows } = req.body;

    const result = await importForecastService({ modelVersion, generatedAt, rows, context: auditContext(req, res) });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Forecast imported successfully.",
        data: result,
    });
};

export const getDemandController = async (req, res) => {
    const { from, to, depotId, brand, tempClass, modelVersion, page, pageSize } = req.query;

    const result = await getDemandService({ userId: req.user.id, from, to, depotId, brand, tempClass, modelVersion, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Demand forecast retrieved successfully.",
        data: result,
    });
};

export const getCapacityController = async (req, res) => {
    const { weekStart, depotId } = req.query;

    const result = await getCapacityService({ userId: req.user.id, weekStart, depotId });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Capacity plan retrieved successfully.",
        data: result,
    });
};
