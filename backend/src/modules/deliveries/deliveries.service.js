import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertTripDriver } from "../../utils/scope.js";
import { deviceInstant, fromYmd, todayBusinessDate } from "../../utils/businessTime.js";
import * as usersService from "../users/users.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as tripsService from "../trips/trips.service.js";
import * as plansService from "../plans/plans.service.js";
import * as filesService from "../files/files.service.js";
import * as loadingService from "../loading/loading.service.js";
import {
    createDeliveredLinesTx,
    createPodPhotosTx,
    createProofTx,
    createStopEventTx,
    findDriverStops,
    findDriverTrips,
    findProofByClientMutationId,
    findStopEventByClientMutationId,
    findStopState,
    findTripBundle,
} from "./deliveries.repository.js";
import { toDeliveriesSummaryDTO, toRouteBundleDTO, toStopStateDTO, toTripBundleDTO } from "./deliveries.dto.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

// the driver's route bundle covers plans that are published or under way
const BUNDLE_PLAN_STATUSES = ["PUBLISHED", "IN_EXECUTION"];
// the summary also keeps counting once the plan is completed
const SUMMARY_PLAN_STATUSES = ["PUBLISHED", "IN_EXECUTION", "COMPLETED"];

const STOP_STATUS_OF_EVENT = {
    ARRIVED: "ARRIVED",
    UNLOADING_STARTED: "UNLOADING",
    FAILED: "FAILED",
    SKIPPED: "SKIPPED",
};

const assertDriver = (scope) => {
    if (scope.role !== Role.DRIVER) throw new AppError("Only drivers can do this.", 403);
};

const clientMutationIdClash = () =>
    new AppError("This clientMutationId was already used for something else.", 409, [
        { field: "clientMutationId", message: "Already in use.", code: "unique" },
    ]);

const tripNotInTransit = (trip) =>
    new AppError(`Trip ${trip.code} is ${trip.status}; it has to be IN_TRANSIT.`, 409, [
        { code: "TRIP_NOT_IN_TRANSIT", tripId: trip.id, currentStatus: trip.status },
    ]);

const loadStopState = async (stopId) => toStopStateDTO(await findStopState(stopId));

const loadTripBundle = async (tripId) => toTripBundleDTO(await findTripBundle(tripId));

// Completes the trip when its last stop became final, and the plan when its last trip did.
const finishTripIfDoneTx = async (tx, { tripId, planId, at }) => {
    const completed = await tripsService.completeTripIfAllStopsFinalTx(tx, { tripId, planId, at });
    if (completed) await plansService.markCompletedIfDoneTx(tx, planId);
};

// Runs a write that carries a clientMutationId. Two copies of one retry that run at the same moment end
// in a unique-constraint error for the loser: when that error is really the same mutation, it is a retry.
const runIdempotent = async (clientMutationId, isRetryOfMine, work) => {
    try {
        await getPrisma().$transaction(work, TX_OPTIONS);
    } catch (error) {
        if (!(error?.code === "P2002" && clientMutationId && (await isRetryOfMine()))) throw error;
    }
};

// ---- reads ----

export const getTodayService = async ({ userId, date }) => {
    const scope = await usersService.getScope(userId);
    assertDriver(scope);

    const day = date ?? todayBusinessDate();
    const trips = await findDriverTrips({ driverId: userId, deliveryDate: fromYmd(day), planStatuses: BUNDLE_PLAN_STATUSES });
    return toRouteBundleDTO({ date: day, trips });
};

export const getDeliveriesSummaryService = async ({ userId, date }) => {
    const scope = await usersService.getScope(userId);
    assertDriver(scope);

    const day = date ?? todayBusinessDate();
    const stops = await findDriverStops({ driverId: userId, deliveryDate: fromYmd(day), planStatuses: SUMMARY_PLAN_STATUSES });
    return toDeliveriesSummaryDTO({ date: day, stops });
};

// ---- depart ----

// The driver leaves the depot: the trip LOADED -> IN_TRANSIT, its orders IN_TRANSIT, the plan IN_EXECUTION,
// and the outlets' store managers hear about it. A trip that already left answers with its current state, so
// a retry changes nothing. A vehicle can only be on one trip at a time (409 VEHICLE_BUSY).
// Used by POST /deliveries/trips/:tripId/depart and by the offline sync (TRIP_DEPARTED). user = { id }.
export const depart = async (user, { tripId, recordedAtDevice, clockOffsetMs, now = new Date() }) => {
    const scope = await usersService.getScope(user.id);
    assertDriver(scope);

    const trip = await tripsService.getTripRef(tripId);
    assertTripDriver(scope, trip);

    const alreadyLeft = (status) => status === "IN_TRANSIT" || status === "COMPLETED";
    if (alreadyLeft(trip.status)) return loadTripBundle(tripId);
    if (trip.status !== "LOADED") {
        throw new AppError(`Trip ${trip.code} is ${trip.status}; it can only leave once loading is complete.`, 409, [
            { code: "TRIP_NOT_LOADED", tripId, currentStatus: trip.status },
        ]);
    }

    const departedAt = deviceInstant(recordedAtDevice, { clockOffsetMs, now });

    await getPrisma().$transaction(async (tx) => {
        // takes the plan lock, which also keeps two trips of one vehicle from leaving at the same moment
        await plansService.markInExecutionTx(tx, trip.planId);

        const current = await tripsService.getTripRef(tripId, tx);
        if (alreadyLeft(current.status)) return;

        const busy = await tripsService.findVehicleTripOnRoad({ vehicleId: trip.vehicleId, excludeTripId: tripId }, tx);
        if (busy) {
            throw new AppError(`The vehicle is still out on trip ${busy.code}.`, 409, [
                { code: "VEHICLE_BUSY", tripId: busy.id, tripCode: busy.code },
            ]);
        }

        await tripsService.transitionTripTx(tx, { tripId, toStatus: "IN_TRANSIT", at: departedAt });

        const orders = await tripsService.listTripOrdersTx(tx, tripId);
        await ordersService.transitionOrdersTx(tx, {
            orderIds: orders.map((order) => order.orderId),
            toStatus: "IN_TRANSIT",
            actorId: user.id,
            data: { tripId },
        });

        const managersByOutlet = await notificationsService.storeManagersOfOutlets([...new Set(orders.map((order) => order.outletId))]);
        await notificationsService.notifyManyTx(
            tx,
            orders.map((order) => ({
                userIds: managersByOutlet.get(order.outletId) ?? [],
                payload: notificationsService.buildTripDepartedNotification({
                    orderId: order.orderId,
                    reference: order.reference,
                    tripCode: trip.code,
                }),
            })),
        );
    }, TX_OPTIONS);

    return loadTripBundle(tripId);
};

// ---- stop events ----

// A delivery that did not happen (FAILED, or SKIPPED before arrival): the stop's orders fail, the depot's
// dispatchers and the outlet's store managers are told, and the trip finishes if this was its last stop.
const failStopTx = async (tx, { user, stop, reason, at }) => {
    const orders = await tripsService.listStopOrdersTx(tx, stop.id);
    await ordersService.transitionOrdersTx(tx, {
        orderIds: orders.map((order) => order.orderId),
        toStatus: "FAILED",
        actorId: user.id,
        reason,
        data: { stopId: stop.id },
    });

    const [dispatcherIds, managerIds] = await Promise.all([
        notificationsService.usersOfDepot(stop.trip.depotId, Role.DISPATCHER),
        notificationsService.storeManagersOfOutlet(stop.outletId),
    ]);
    await notificationsService.notifyManyTx(
        tx,
        orders.flatMap((order) => {
            const details = { orderId: order.orderId, reference: order.reference, outletName: stop.outlet.name, reason };
            return [
                { userIds: dispatcherIds, payload: notificationsService.buildDeliveryFailedNotification({ audience: "dispatcher", ...details }) },
                { userIds: managerIds, payload: notificationsService.buildDeliveryFailedNotification({ audience: "storeManager", ...details }) },
            ];
        }),
    );

    await finishTripIfDoneTx(tx, { tripId: stop.tripId, planId: stop.trip.planId, at });
};

// Records an event at a stop while the trip is IN_TRANSIT: PENDING -> ARRIVED, ARRIVED -> UNLOADING,
// PENDING/ARRIVED/UNLOADING -> FAILED (a reason is required), PENDING -> SKIPPED. Every event is appended
// to the stop's event log. A repeated clientMutationId answers with the stop as it is now.
// Used by POST /deliveries/stops/:stopId/events and by the offline sync (STOP_EVENT). user = { id }.
export const recordStopEvent = async (user, { stopId, type, recordedAtDevice, lat, lng, failureReason, clientMutationId, clockOffsetMs, now = new Date() }) => {
    const scope = await usersService.getScope(user.id);
    assertDriver(scope);

    const stop = await tripsService.getStopRef(stopId);
    assertTripDriver(scope, stop.trip);

    const at = deviceInstant(recordedAtDevice, { clockOffsetMs, now });

    const isRetryOfMine = async () => {
        const event = await findStopEventByClientMutationId(clientMutationId);
        return Boolean(event) && event.stopId === stopId && event.actorId === user.id;
    };

    await runIdempotent(clientMutationId, isRetryOfMine, async (tx) => {
        if (clientMutationId) {
            const used = await findStopEventByClientMutationId(clientMutationId, tx);
            if (used) {
                if (used.stopId !== stopId || used.actorId !== user.id) throw clientMutationIdClash();
                return;
            }
        }

        const current = await tripsService.getStopRef(stopId, tx);
        if (current.trip.status !== "IN_TRANSIT") throw tripNotInTransit(current.trip);

        // the event is written first, so a second copy of the same retry stops here, on the unique id
        await createStopEventTx(tx, {
            stopId,
            type,
            recordedAtDevice,
            clockOffsetMs: clockOffsetMs ?? null,
            lat: lat ?? null,
            lng: lng ?? null,
            actorId: user.id,
            clientMutationId: clientMutationId ?? null,
            data: { from: current.status, ...(failureReason && { failureReason }) },
        });

        await tripsService.transitionStopTx(tx, {
            stopId,
            toStatus: STOP_STATUS_OF_EVENT[type],
            data: {
                ...(type === "ARRIVED" && { arrivedAt: at }),
                ...(type === "UNLOADING_STARTED" && { unloadingStartedAt: at }),
                ...(type === "FAILED" && { failureReason }),
                ...(type === "SKIPPED" && { failureReason: failureReason ?? null }),
            },
        });

        if (type === "FAILED" || type === "SKIPPED") {
            await failStopTx(tx, { user, stop: current, reason: type === "SKIPPED" ? "Stop skipped" : failureReason, at });
        }
    });

    return loadStopState(stopId);
};

// ---- proof of delivery ----

// the most that can be delivered of an item: what was loaded (the ordered quantity when nothing was recorded)
const deliverableOf = (item, check) => check?.loadedQty ?? item.quantity;

const loadedShort = (check) => Boolean(check) && check.loadedQty !== null && check.loadedQty < check.plannedQty;

// The delivered lines must cover every item at the stop, never exceed what was loaded, and agree with
// allDeliveredAsPlanned. Throws 422 with one entry per problem.
const assertProofLines = ({ lines, items, loaded, allDeliveredAsPlanned }) => {
    const itemById = new Map(items.map((item) => [item.orderItemId, item]));
    const problems = [];

    lines.forEach((line, index) => {
        const item = itemById.get(line.orderItemId);
        if (!item) {
            problems.push({ field: `lines.${index}.orderItemId`, message: "This item is not delivered at this stop.", code: "unknown_item" });
            return;
        }
        const limit = deliverableOf(item, loaded.get(item.orderItemId));
        if (line.deliveredQty > limit) {
            problems.push({ field: `lines.${index}.deliveredQty`, message: `Cannot be more than ${limit}, the quantity loaded.`, code: "too_big" });
        }
    });

    const given = new Set(lines.map((line) => line.orderItemId));
    for (const item of items) {
        if (!given.has(item.orderItemId)) {
            problems.push({ field: "lines", message: `Item ${item.itemName} (${item.orderItemId}) is missing.`, code: "missing_line" });
        }
    }

    if (allDeliveredAsPlanned) {
        if (items.some((item) => loadedShort(loaded.get(item.orderItemId)))) {
            problems.push({
                field: "allDeliveredAsPlanned",
                message: "Some items were loaded short, so not everything can have been delivered as planned.",
                code: "inconsistent",
            });
        } else if (lines.some((line) => line.deliveredQty !== itemById.get(line.orderItemId)?.quantity)) {
            problems.push({
                field: "allDeliveredAsPlanned",
                message: "The delivered quantities are less than ordered.",
                code: "inconsistent",
            });
        }
    }

    if (problems.length > 0) throw new AppError("Validation failed.", 422, problems);
};

// Submits the proof of delivery for a stop the driver has reached (ARRIVED or UNLOADING): receiver,
// signature, photos and the quantity delivered per item. The stop becomes COMPLETED (everything delivered
// as ordered) or PARTIAL, each order DELIVERED or PARTIALLY_DELIVERED, the store managers are asked to
// confirm receipt, and the trip (then the plan) completes when this was the last open stop (trip).
// A repeated clientMutationId answers with the stop as it is now.
// Used by POST /deliveries/stops/:stopId/proof and by the offline sync (STOP_PROOF). user = { id }.
export const submitProof = async (user, input) => {
    const { stopId, receiverName, signatureFileId, photoFileIds, allDeliveredAsPlanned, lines, capturedAtDevice, clientMutationId, clockOffsetMs, now = new Date() } = input;

    const scope = await usersService.getScope(user.id);
    assertDriver(scope);

    const stop = await tripsService.getStopRef(stopId);
    assertTripDriver(scope, stop.trip);

    const completedAt = deviceInstant(capturedAtDevice, { clockOffsetMs, now });

    const isRetryOfMine = async () => {
        const proof = await findProofByClientMutationId(clientMutationId);
        return Boolean(proof) && proof.stopId === stopId && proof.driverId === user.id;
    };

    await runIdempotent(clientMutationId, isRetryOfMine, async (tx) => {
        if (clientMutationId) {
            const used = await findProofByClientMutationId(clientMutationId, tx);
            if (used) {
                if (used.stopId !== stopId || used.driverId !== user.id) throw clientMutationIdClash();
                return;
            }
        }

        const current = await tripsService.getStopRef(stopId, tx);
        if (current.trip.status !== "IN_TRANSIT") throw tripNotInTransit(current.trip);
        if (!["ARRIVED", "UNLOADING"].includes(current.status)) {
            throw new AppError(`The stop is ${current.status}; proof can only be submitted once the driver has arrived.`, 409, [
                { code: "STOP_NOT_READY", stopId, currentStatus: current.status },
            ]);
        }

        const orders = await tripsService.listStopOrdersTx(tx, stopId);
        const items = orders.flatMap((order) => order.items);
        const loaded = await loadingService.getLoadedQuantitiesTx(tx, items.map((item) => item.orderItemId));
        assertProofLines({ lines, items, loaded, allDeliveredAsPlanned });

        await filesService.assertAttachableTx(tx, { fileIds: [signatureFileId], kind: "SIGNATURE", userId: user.id });
        const photoIds = await filesService.assertAttachableTx(tx, { fileIds: photoFileIds, kind: "POD_PHOTO", userId: user.id });

        // the proof is written first, so a second copy of the same retry stops here, on the unique id
        const proof = await createProofTx(tx, {
            stopId,
            receiverName,
            signatureFileId,
            allDeliveredAsPlanned,
            capturedAtDevice,
            driverId: user.id,
            clientMutationId: clientMutationId ?? null,
        });
        if (photoIds.length > 0) await createPodPhotosTx(tx, proof.id, photoIds);
        await createDeliveredLinesTx(tx, stopId, lines);

        const deliveredOf = new Map(lines.map((line) => [line.orderItemId, line.deliveredQty]));
        const isFull = (order) => order.items.every((item) => deliveredOf.get(item.orderItemId) === item.quantity);
        const fullOrders = orders.filter(isFull);
        const partialOrders = orders.filter((order) => !isFull(order));

        await createStopEventTx(tx, {
            stopId,
            type: "COMPLETED",
            recordedAtDevice: capturedAtDevice,
            clockOffsetMs: clockOffsetMs ?? null,
            actorId: user.id,
            data: { from: current.status, partialOrders: partialOrders.length },
        });
        await tripsService.transitionStopTx(tx, {
            stopId,
            toStatus: partialOrders.length === 0 ? "COMPLETED" : "PARTIAL",
            data: { completedAt },
        });

        await ordersService.transitionOrdersTx(tx, {
            orderIds: fullOrders.map((order) => order.orderId),
            toStatus: "DELIVERED",
            actorId: user.id,
            data: { stopId },
        });
        await ordersService.transitionOrdersTx(tx, {
            orderIds: partialOrders.map((order) => order.orderId),
            toStatus: "PARTIALLY_DELIVERED",
            actorId: user.id,
            data: { stopId },
        });

        const [managerIds, dispatcherIds] = await Promise.all([
            notificationsService.storeManagersOfOutlet(current.outletId),
            partialOrders.length > 0 ? notificationsService.usersOfDepot(current.trip.depotId, Role.DISPATCHER) : [],
        ]);
        await notificationsService.notifyManyTx(tx, [
            ...orders.map((order) => ({
                userIds: managerIds,
                payload: notificationsService.buildOrderDeliveredNotification({
                    orderId: order.orderId,
                    reference: order.reference,
                    partial: !isFull(order),
                }),
            })),
            ...partialOrders.map((order) => ({
                userIds: dispatcherIds,
                payload: notificationsService.buildDeliveryPartialNotification({
                    orderId: order.orderId,
                    reference: order.reference,
                    outletName: current.outlet.name,
                }),
            })),
        ]);

        await finishTripIfDoneTx(tx, { tripId: current.tripId, planId: current.trip.planId, at: completedAt });
    });

    return loadStopState(stopId);
};
