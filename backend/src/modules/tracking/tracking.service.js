import * as repository from "./tracking.repository.js";
import { AppError } from "../../utils/appError.js";

export async function recordPing(data) {
    return repository.saveLocationPing(data);
}

export async function fetchActiveTrips() {
    return repository.getActiveTrips();
}

export async function fetchTripHistory(tripId) {
    const history = await repository.getTripHistory(tripId);
    if (!history || history.length === 0) {
        throw new AppError("No tracking history found for this trip", 404);
    }
    return history;
}
