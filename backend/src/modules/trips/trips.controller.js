import { sendSuccess } from "../../utils/apiResponse.js";
import {
    changeDriverService,
    changeSequenceService,
    createSequenceRequestService,
    decideSequenceRequestService,
    getTripService,
    listSequenceRequestsService,
    listTripsService,
} from "./trips.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    actorId: req.user.id,
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const listTripsController = async (req, res) => {
    const { deliveryDate, depotId, planId, page, pageSize } = req.query;

    const result = await listTripsService({ userId: req.user.id, deliveryDate, depotId, planId, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Trips retrieved successfully.",
        data: result,
    });
};

export const getTripController = async (req, res) => {
    const result = await getTripService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Trip retrieved successfully.",
        data: result,
    });
};

export const changeSequenceController = async (req, res) => {
    const result = await changeSequenceService({
        userId: req.user.id,
        id: req.params.id,
        stopIds: req.body.stopIds,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Stop sequence updated successfully.",
        data: result,
    });
};

export const changeDriverController = async (req, res) => {
    const result = await changeDriverService({
        userId: req.user.id,
        id: req.params.id,
        driverId: req.body.driverId,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Trip driver updated successfully.",
        data: result,
    });
};

export const createSequenceRequestController = async (req, res) => {
    const { proposedStopIds, reason } = req.body;

    const result = await createSequenceRequestService({ userId: req.user.id, id: req.params.id, proposedStopIds, reason });

    return sendSuccess(res, {
        statusCode: 201,
        message: "Stop order change requested.",
        data: result,
    });
};

export const listSequenceRequestsController = async (req, res) => {
    const { page, pageSize } = req.query;

    const result = await listSequenceRequestsService({ userId: req.user.id, id: req.params.id, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Sequence requests retrieved successfully.",
        data: result,
    });
};

export const decideSequenceRequestController = async (req, res) => {
    const result = await decideSequenceRequestService({
        userId: req.user.id,
        requestId: req.params.requestId,
        decision: req.body.decision,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: `Request ${req.body.decision.toLowerCase()}.`,
        data: result,
    });
};
