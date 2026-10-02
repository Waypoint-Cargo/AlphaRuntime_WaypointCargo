import { createHash } from "node:crypto";
import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import logger from "../../config/logger.js";
import { translateDatabaseError } from "../../middlewares/errorHandler.js";
import { assertDepotAccess, assertTripDriver } from "../../utils/scope.js";
import * as usersService from "../users/users.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as tripsService from "../trips/trips.service.js";
import * as issuesService from "../issues/issues.service.js";
import * as loadingService from "../loading/loading.service.js";
import * as deliveriesService from "../deliveries/deliveries.service.js";
import * as trackingService from "../tracking/tracking.service.js";
import {
    claimIdempotencyKey,
    createSyncMutation,
    deleteIdempotencyKey,
    findIdempotencyKey,
    findSyncMutation,
    storeIdempotencyResponse,
    takeOverIdempotencyKey,
} from "./sync.repository.js";
import {
    toAppliedResultDTO,
    toBatchDTO,
    toDuplicateResultDTO,
    toMutationDataDTO,
    toRejectedResultDTO,
    toRetryableResultDTO,
} from "./sync.dto.js";
import { DEVICE_TIME_FIELD, PAYLOAD_SCHEMAS } from "./sync.validator.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
// a key that has no stored response after this long belongs to a request that died
const KEY_IN_PROGRESS_MS = 2 * 60_000;

// what each role may send
const ROLE_MUTATION_TYPES = {
    [Role.DRIVER]: ["TRIP_DEPARTED", "STOP_EVENT", "STOP_PROOF", "ISSUE_REPORTED", "LOCATION_PINGS"],
    [Role.LOADER]: ["LOAD_ITEM_CHECKED", "LOADING_COMPLETED", "ISSUE_REPORTED"],
};

// ---- one mutation: the service it replays ----

// Each mutation calls the service the online endpoint calls, with the payload as its input.
const APPLY = {
    TRIP_DEPARTED: (user, input, context) => deliveriesService.depart(user, { ...input, ...context }),
    STOP_EVENT: (user, input, context) => deliveriesService.recordStopEvent(user, { ...input, ...context }),
    STOP_PROOF: (user, input, context) => deliveriesService.submitProof(user, { ...input, ...context }),
    ISSUE_REPORTED: (user, input) => issuesService.createIssueService({ userId: user.id, input }),
    LOAD_ITEM_CHECKED: (user, input) => loadingService.checkItem(user, input),
    LOADING_COMPLETED: (user, input) => loadingService.completeLoading(user, input),
    LOCATION_PINGS: (user, input, context) => trackingService.recordPings(user, { ...input, ...context }),
};

// A rejected mutation of these types is recorded but does not raise a SYNC_CONFLICT issue for the
// dispatchers: late GPS pings (the trip has finished) are not worth their attention.
const NO_CONFLICT_ISSUE_TYPES = ["LOCATION_PINGS"];

// The payload as the online endpoint would receive it: the mutation's own id and device time fill the
// fields the online request carries itself. Throws 422 when the payload is not valid for its type.
const parsePayload = ({ clientMutationId, type, deviceTime, payload }) => {
    const timeField = DEVICE_TIME_FIELD[type];
    const candidate = {
        ...(timeField && { [timeField]: deviceTime.toISOString() }),
        ...payload,
        clientMutationId,
    };

    const parsed = PAYLOAD_SCHEMAS[type].safeParse(candidate);
    if (!parsed.success) {
        throw new AppError(
            "The payload is not valid.",
            422,
            parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message, code: issue.code })),
        );
    }
    return parsed.data;
};

// ---- recording what happened ----

const toPlainJson = (value) => JSON.parse(JSON.stringify(value ?? null));

// the code a rejection is recorded under: the application code in the details, else the HTTP status
const rejectionCodeOf = (error) => error.details?.find?.((detail) => typeof detail?.code === "string")?.code ?? `HTTP_${error.statusCode}`;

// Ids in the payload that point at records this user may act on (the rest are ignored: a conflict issue
// must not reveal or attach records outside the user's scope).
const conflictTargets = async (scope, payload) => {
    const targets = {};

    const consider = async (field, load, assertAccess) => {
        const id = payload?.[field];
        if (typeof id !== "string" || id.length === 0) return;
        try {
            assertAccess(await load(id));
            targets[field] = id;
        } catch {
            // not found or not theirs: left out of the issue
        }
    };

    const isDriver = scope.role === Role.DRIVER;
    await consider("orderId", (id) => ordersService.getOrderRef(id), (order) =>
        isDriver ? assertTripDriver(scope, { driverId: order.driverId }) : assertDepotAccess(scope, order.depotId),
    );
    await consider("tripId", (id) => tripsService.getTripRef(id), (trip) =>
        isDriver ? assertTripDriver(scope, trip) : assertDepotAccess(scope, trip.depotId),
    );
    await consider("stopId", (id) => tripsService.getStopRef(id), (stop) =>
        isDriver ? assertTripDriver(scope, stop.trip) : assertDepotAccess(scope, stop.trip.depotId),
    );

    return targets;
};

// A mutation the server refused for good: it is recorded so a resend is answered without trying again. A
// conflict (409) or an unprocessable change (422) also raises a SYNC_CONFLICT issue for the dispatchers when
// it points at a record the user may act on.
const recordRejection = async ({ user, scope, deviceId, mutation, error }) => {
    const { clientMutationId, type, deviceTime, payload } = mutation;
    const code = rejectionCodeOf(error);
    const outcome = { code, statusCode: error.statusCode, message: error.message, details: error.details };

    const raisesIssue = (error.statusCode === 409 || error.statusCode === 422) && !NO_CONFLICT_ISSUE_TYPES.includes(type);
    const targets = raisesIssue ? await conflictTargets(scope, payload) : {};

    await getPrisma().$transaction(async (tx) => {
        await createSyncMutation(
            {
                clientMutationId,
                userId: user.id,
                deviceId: deviceId ?? null,
                type,
                result: "REJECTED",
                resultCode: code,
                response: toPlainJson({ statusCode: error.statusCode, message: error.message, details: error.details }),
            },
            tx,
        );

        if (Object.keys(targets).length > 0) {
            await issuesService.createSystemIssueTx(tx, {
                type: "SYNC_CONFLICT",
                ...targets,
                description: `The offline change ${type} (${clientMutationId}) from ${deviceTime.toISOString()} could not be applied: ${error.message}`,
                reportedById: user.id,
            });
        }
    }, TX_OPTIONS);

    return toRejectedResultDTO(clientMutationId, outcome);
};

const processMutation = async ({ user, scope, deviceId, clockOffsetMs, mutation }) => {
    const { clientMutationId, type } = mutation;

    try {
        const seen = await findSyncMutation(clientMutationId);
        if (seen) {
            if (seen.userId !== user.id) {
                return toRejectedResultDTO(clientMutationId, {
                    code: "CLIENT_MUTATION_ID_TAKEN",
                    statusCode: 409,
                    message: "This clientMutationId was already used by someone else.",
                });
            }
            return toDuplicateResultDTO(seen);
        }

        if (!ROLE_MUTATION_TYPES[scope.role].includes(type)) {
            throw new AppError(`A ${scope.role.toLowerCase()} cannot send ${type}.`, 403);
        }

        const input = parsePayload(mutation);
        const data = toPlainJson(toMutationDataDTO(type, await APPLY[type](user, input, { clockOffsetMs })));

        try {
            await createSyncMutation({
                clientMutationId,
                userId: user.id,
                deviceId: deviceId ?? null,
                type,
                result: "APPLIED",
                resultCode: null,
                response: data,
            });
        } catch (error) {
            // the same mutation arrived in two batches at once and the other one recorded it first
            if (error?.code !== "P2002") throw error;
            return toDuplicateResultDTO(await findSyncMutation(clientMutationId));
        }
        return toAppliedResultDTO(clientMutationId, data);
    } catch (raised) {
        const error = translateDatabaseError(raised) ?? raised;

        if (error instanceof AppError && error.isOperational && error.statusCode >= 400 && error.statusCode < 500) {
            try {
                return await recordRejection({ user, scope, deviceId, mutation, error });
            } catch (recordingError) {
                logger.error(`Sync: could not record the rejection of ${clientMutationId}: ${recordingError.message}`, {
                    stack: recordingError.stack,
                });
                return toRetryableResultDTO(clientMutationId);
            }
        }

        // anything else is the server's own problem: nothing is recorded, so the app can send it again
        logger.error(`Sync: ${type} ${clientMutationId} failed: ${error.message}`, { stack: error.stack });
        return toRetryableResultDTO(clientMutationId);
    }
};

// Mutations are applied in the order they happened on the device (ties keep the order they were sent in)
// and the results come back in the order they were sent.
const processMutations = async ({ user, scope, deviceId, clockOffsetMs, mutations }) => {
    const order = mutations
        .map((mutation, index) => ({ mutation, index }))
        .sort((a, b) => a.mutation.deviceTime - b.mutation.deviceTime || a.index - b.index);

    const results = new Array(mutations.length);
    for (const { mutation, index } of order) {
        results[index] = await processMutation({ user, scope, deviceId, clockOffsetMs, mutation });
    }
    return results;
};

// ---- idempotency key ----

const requireIdempotencyKey = (value) => {
    const key = typeof value === "string" ? value.trim() : "";
    if (key.length === 0) throw new AppError("The Idempotency-Key header is required.", 400);
    if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
        throw new AppError(`The Idempotency-Key header can be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters.`, 400);
    }
    return key;
};

const requestInProgress = () =>
    new AppError("Another request with this Idempotency-Key is still being processed. Try again shortly.", 409, [
        { code: "REQUEST_IN_PROGRESS" },
    ]);

// Claims the key for this request ({ owned: true }) or answers from an earlier request with the same key
// and body ({ replay }). The same key with another body is a 409.
const claimKey = async ({ userId, key, requestHash, now }) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        if (await claimIdempotencyKey({ userId, key, requestHash })) return { owned: true };

        const existing = await findIdempotencyKey({ userId, key });
        if (!existing) continue; // deleted in between: claim again

        if (existing.requestHash !== requestHash) {
            throw new AppError("This Idempotency-Key was already used with a different request body.", 409, [
                { code: "IDEMPOTENCY_KEY_REUSED" },
            ]);
        }
        if (existing.statusCode !== null) return { replay: existing.response };

        // no response yet: another request is working on it, unless that request died
        if (now.getTime() - existing.createdAt.getTime() < KEY_IN_PROGRESS_MS) throw requestInProgress();
        const staleBefore = new Date(now.getTime() - KEY_IN_PROGRESS_MS);
        if (await takeOverIdempotencyKey({ userId, key, staleBefore, now })) return { owned: true };
        throw requestInProgress();
    }
    throw requestInProgress();
};

// ---- endpoint ----

// Applies a batch of offline changes. The Idempotency-Key header makes the whole request safe to repeat:
// the same key with the same body answers with the first response, another body is a 409. Inside the batch
// each mutation is idempotent by its clientMutationId. user = { id }.
export const submitBatchService = async ({ user, idempotencyKey, body, now = new Date() }) => {
    const key = requireIdempotencyKey(idempotencyKey);

    const scope = await usersService.getScope(user.id);
    if (!ROLE_MUTATION_TYPES[scope.role]) throw new AppError("Your role cannot sync changes.", 403);

    const requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const claim = await claimKey({ userId: user.id, key, requestHash, now });
    if (claim.replay) return claim.replay;

    try {
        const results = await processMutations({
            user,
            scope,
            deviceId: body.deviceId,
            clockOffsetMs: body.clockOffsetMs,
            mutations: body.mutations,
        });
        const response = toPlainJson(toBatchDTO({ serverTime: new Date().toISOString(), results }));

        // a batch with a mutation to retry is not final: the key is freed so the app can send it again
        if (results.some((result) => result.status === "RETRYABLE")) {
            await deleteIdempotencyKey({ userId: user.id, key });
        } else {
            await storeIdempotencyResponse({ userId: user.id, key, statusCode: 200, response });
        }
        return response;
    } catch (error) {
        await deleteIdempotencyKey({ userId: user.id, key }).catch(() => {});
        throw error;
    }
};
