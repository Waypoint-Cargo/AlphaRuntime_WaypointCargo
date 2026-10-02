import { sendSuccess } from "../../utils/apiResponse.js";
import {
    depart,
    getDeliveriesSummaryService,
    getTodayService,
    recordStopEvent,
    submitProof,
} from "./deliveries.service.js";

export const getTodayController = async (req, res) => {
    const result = await getTodayService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Route bundle retrieved successfully.",
        data: result,
    });
};

export const getDeliveriesSummaryController = async (req, res) => {
    const result = await getDeliveriesSummaryService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Delivery summary retrieved successfully.",
        data: result,
    });
};

export const departController = async (req, res) => {
    const { recordedAtDevice } = req.body;

    const result = await depart(req.user, { tripId: req.params.tripId, recordedAtDevice });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Trip departed.",
        data: result,
    });
};

export const recordStopEventController = async (req, res) => {
    const { type, recordedAtDevice, lat, lng, failureReason, clientMutationId } = req.body;

    const result = await recordStopEvent(req.user, {
        stopId: req.params.stopId,
        type,
        recordedAtDevice,
        lat,
        lng,
        failureReason,
        clientMutationId,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Stop event recorded.",
        data: result,
    });
};

export const submitProofController = async (req, res) => {
    const result = await submitProof(req.user, { stopId: req.params.stopId, ...req.body });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Proof of delivery submitted.",
        data: result,
    });
};
