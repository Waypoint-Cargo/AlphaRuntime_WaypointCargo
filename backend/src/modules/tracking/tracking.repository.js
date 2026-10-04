import { getPrisma } from "../../config/database.js";

export async function saveLocationPing(data) {
    return getPrisma().locationPing.create({
        data
    });
}

export async function getActiveTrips() {
    return getPrisma().trip.findMany({
        where: {
            status: {
                in: ["LOADING", "LOADED", "IN_TRANSIT"]
            }
        },
        include: {
            vehicle: true,
            driver: {
                select: { id: true, fullName: true, phone: true }
            },
            locationPings: {
                orderBy: { recordedAt: "desc" },
                take: 1
            },
            stops: {
                include: { outlet: true },
                orderBy: { sequence: "asc" }
            }
        }
    });
}

export async function getTripHistory(tripId) {
    return getPrisma().locationPing.findMany({
        where: { tripId },
        orderBy: { recordedAt: "asc" }
    });
}
