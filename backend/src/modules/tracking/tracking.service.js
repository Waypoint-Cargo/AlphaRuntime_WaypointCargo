import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess, assertTripDriver } from "../../utils/scope.js";
import { addDays, deviceInstant, fromYmd, minutesToHHMM, todayBusinessDate, toUtcInstant } from "../../utils/businessTime.js";
import { toNumber } from "../../utils/serialize.js";
import * as usersService from "../users/users.service.js";
import * as tripsService from "../trips/trips.service.js";
import {
    countOrdersDeliveredBetween,
    createPingsTx,
    findLastPings,
    findLiveTrips,
    findOutletTrips,
    findPingKeysTx,
    findRecentPings,
    findTripStops,
} from "./tracking.repository.js";
import {
    toLiveTrackingDTO,
    toLiveTripDTO,
    toOutletTrackingDTO,
    toOutletTripDTO,
    toPingsResultDTO,
    toTripTrackingDTO,
} from "./tracking.dto.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const TRIP_PING_HISTORY = 200;

// ---- when a stop is in trouble (shared with the dispatcher dashboard) ----

// The instant a stop's delivery window ends on `date`: the end of the outlet's window, or of its mall
// access window when that ends earlier.
export const stopWindowEnd = (outlet, date) => {
    const end =
        outlet.isMall && outlet.mallAccessEndMin !== null && outlet.mallAccessEndMin !== undefined
            ? Math.min(outlet.windowEndMin, outlet.mallAccessEndMin)
            : outlet.windowEndMin;
    return toUtcInstant(date, minutesToHHMM(end));
};

// A pending stop is at risk when its window has already ended, or when it is predicted to be reached
// after the window ends.
export const isStopAtRisk = (stop, { date, now }) => {
    if (stop.status !== "PENDING") return false;
    const windowEnd = stopWindowEnd(stop.outlet, date);
    return now.getTime() > windowEnd.getTime() || Boolean(stop.predictedArrival && stop.predictedArrival.getTime() > windowEnd.getTime());
};

// ---- pings ----

const pingKey = (recordedAt, lat, lng) => `${recordedAt.getTime()}|${Number(lat).toFixed(6)}|${Number(lng).toFixed(6)}`;

// Stores a driver's GPS pings for a trip that is IN_TRANSIT. Pings that are already stored (a retry) or
// repeated inside the request are skipped, so sending a batch twice is harmless.
// Used by POST /tracking/trips/:tripId/pings and by the offline sync (LOCATION_PINGS). user = { id }.
export const recordPings = async (user, { tripId, pings, clockOffsetMs, now = new Date() }) => {
    const scope = await usersService.getScope(user.id);
    if (scope.role !== Role.DRIVER) throw new AppError("Only drivers can send pings.", 403);

    const trip = await tripsService.getTripRef(tripId);
    assertTripDriver(scope, trip);

    const unique = new Map();
    for (const ping of pings) {
        const recordedAt = deviceInstant(ping.recordedAt, { clockOffsetMs, now });
        const key = pingKey(recordedAt, ping.lat, ping.lng);
        if (!unique.has(key)) unique.set(key, { tripId, lat: ping.lat, lng: ping.lng, speedKmh: ping.speedKmh ?? null, recordedAt });
    }
    const rows = [...unique.values()];
    const times = rows.map((row) => row.recordedAt.getTime());

    return getPrisma().$transaction(async (tx) => {
        const current = await tripsService.getTripRef(tripId, tx);
        if (current.status !== "IN_TRANSIT") {
            throw new AppError(`Trip ${current.code} is ${current.status}; pings are only accepted while it is IN_TRANSIT.`, 409, [
                { code: "TRIP_NOT_IN_TRANSIT", tripId, currentStatus: current.status },
            ]);
        }

        const stored = await findPingKeysTx(tx, { tripId, from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) });
        const known = new Set(stored.map((ping) => pingKey(ping.recordedAt, toNumber(ping.lat), toNumber(ping.lng))));
        const fresh = rows.filter((row) => !known.has(pingKey(row.recordedAt, row.lat, row.lng)));
        if (fresh.length > 0) await createPingsTx(tx, fresh);

        return toPingsResultDTO({ tripId, accepted: fresh.length, skipped: pings.length - fresh.length });
    }, TX_OPTIONS);
};

// ---- the dispatcher's live view ----

export const getLiveService = async ({ userId, date, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    const day = date ?? todayBusinessDate(now);
    const depotIds = scope.depotIds;

    const trips = await findLiveTrips({ depotIds, deliveryDate: fromYmd(day) });
    const [lastPings, deliveredToday] = await Promise.all([
        findLastPings(trips.map((trip) => trip.id)),
        countOrdersDeliveredBetween({ depotIds, from: toUtcInstant(day, "00:00"), to: toUtcInstant(addDays(day, 1), "00:00") }),
    ]);
    const lastPingOf = new Map(lastPings.map((ping) => [ping.tripId, ping]));

    const items = trips.map((trip) => {
        const pending = trip.stops.filter((stop) => stop.status === "PENDING");
        const next = pending[0] ?? null;
        return toLiveTripDTO({
            trip,
            lastPing: lastPingOf.get(trip.id) ?? null,
            next,
            nextAtRisk: next ? isStopAtRisk(next, { date: day, now }) : false,
            delayed: pending.some((stop) => isStopAtRisk(stop, { date: day, now })),
        });
    });

    return toLiveTrackingDTO({
        date: day,
        active: items.filter((item) => item.status === "IN_TRANSIT").length,
        delayed: items.filter((item) => item.delayed).length,
        deliveredToday,
        trips: items,
    });
};

// ---- the store manager's view ----

// Today's trips that visit the manager's outlet, with the outlet's own stop. Other outlets' stops are
// never returned, only how many come before this one.
export const getOutletTrackingService = async ({ userId, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    if (scope.role !== Role.STORE_MANAGER || !scope.outletId) {
        throw new AppError("Your account is not assigned to an outlet.", 403);
    }

    const day = todayBusinessDate(now);
    const trips = await findOutletTrips({ outletId: scope.outletId, deliveryDate: fromYmd(day) });

    return toOutletTrackingDTO({
        date: day,
        trips: trips.map((trip) => {
            const own = trip.stops.find((stop) => stop.outletId === scope.outletId);
            return toOutletTripDTO({ trip, own, before: trip.stops.filter((stop) => stop.sequence < own.sequence) });
        }),
    });
};

// ---- one trip ----

// The last 200 pings of a trip in time order and the status of its stops. A dispatcher of the trip's
// depot, or the driver of the trip.
export const getTripTrackingService = async ({ userId, tripId }) => {
    const scope = await usersService.getScope(userId);
    const trip = await tripsService.getTripRef(tripId);

    if (scope.role === Role.DRIVER) assertTripDriver(scope, trip);
    else assertDepotAccess(scope, trip.depotId);

    const [recent, stops] = await Promise.all([findRecentPings({ tripId, take: TRIP_PING_HISTORY }), findTripStops(tripId)]);
    return toTripTrackingDTO({ trip, pings: recent.reverse(), stops });
};
