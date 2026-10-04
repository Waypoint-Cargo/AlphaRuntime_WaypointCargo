import * as trackingService from "./tracking.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";

export async function recordPingController(req, res) {
    const ping = await trackingService.recordPing(req.body);
    return sendSuccess(res, {
        statusCode: 201,
        message: "Location ping recorded successfully",
        data: ping
    });
}

export async function getActiveTripsController(req, res) {
    const trips = await trackingService.fetchActiveTrips();
    return sendSuccess(res, {
        message: "Active trips fetched successfully",
        data: trips
    });
}

export async function getTripHistoryController(req, res) {
    const { tripId } = req.params;
    const history = await trackingService.fetchTripHistory(tripId);
    return sendSuccess(res, {
        message: "Trip history fetched successfully",
        data: history
    });
}
