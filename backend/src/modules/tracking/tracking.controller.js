import { sendSuccess } from "../../utils/apiResponse.js";
import { getLiveService, getOutletTrackingService, getTripTrackingService, recordPings } from "./tracking.service.js";

export const recordPingsController = async (req, res) => {
    const result = await recordPings(req.user, { tripId: req.params.tripId, pings: req.body.pings });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Pings recorded successfully.",
        data: result,
    });
};

export const getLiveController = async (req, res) => {
    const result = await getLiveService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Live tracking retrieved successfully.",
        data: result,
    });
};

export const getOutletTrackingController = async (req, res) => {
    const result = await getOutletTrackingService({ userId: req.user.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Delivery tracking retrieved successfully.",
        data: result,
    });
};

export const getTripTrackingController = async (req, res) => {
    const result = await getTripTrackingService({ userId: req.user.id, tripId: req.params.tripId });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Trip tracking retrieved successfully.",
        data: result,
    });
};
