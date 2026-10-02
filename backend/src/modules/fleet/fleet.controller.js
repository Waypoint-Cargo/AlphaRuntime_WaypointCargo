import { sendSuccess } from "../../utils/apiResponse.js";
import {
    getFleetSummaryService,
    getMyVehicleService,
    getVehicleService,
    listFleetService,
    updateVehicleService,
} from "./fleet.service.js";

export const listFleetController = async (req, res) => {
    const { depotId, type, isRefrigerated, isActive, q, page, pageSize } = req.query;

    const result = await listFleetService({
        userId: req.user.id,
        depotId,
        type,
        isRefrigerated,
        isActive,
        q,
        page,
        pageSize,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Fleet retrieved successfully.",
        data: result,
    });
};

export const fleetSummaryController = async (req, res) => {
    const result = await getFleetSummaryService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Fleet summary retrieved successfully.",
        data: result,
    });
};

export const getVehicleController = async (req, res) => {
    const result = await getVehicleService({ userId: req.user.id, id: req.params.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Vehicle retrieved successfully.",
        data: result,
    });
};

export const myVehicleController = async (req, res) => {
    const result = await getMyVehicleService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Vehicle retrieved successfully.",
        data: result,
    });
};

export const updateVehicleController = async (req, res) => {
    const { isActive, statusNote, defaultDriverId } = req.body;

    const result = await updateVehicleService({
        id: req.params.id,
        isActive,
        statusNote,
        defaultDriverId,
        context: { actorId: req.user.id, ip: req.ip, requestId: res.locals.requestId },
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Vehicle updated successfully.",
        data: result,
    });
};
