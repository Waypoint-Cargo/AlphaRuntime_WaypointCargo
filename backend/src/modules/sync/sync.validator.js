import { z } from "zod";
import { clientId, isoDateTime } from "../../utils/validation.js";
import { createIssueBodySchema } from "../issues/issues.validator.js";
import { checkItemPayloadSchema, completeLoadingPayloadSchema } from "../loading/loading.validator.js";
import { departPayloadSchema, proofPayloadSchema, stopEventPayloadSchema } from "../deliveries/deliveries.validator.js";
import { recordPingsPayloadSchema } from "../tracking/tracking.validator.js";

// The payload of each mutation type is the body of the online endpoint it replays (plus the ids the online
// endpoint takes from its path), so a payload is valid exactly when the online request would be.
export const PAYLOAD_SCHEMAS = {
    TRIP_DEPARTED: departPayloadSchema,
    STOP_EVENT: stopEventPayloadSchema,
    STOP_PROOF: proofPayloadSchema,
    ISSUE_REPORTED: createIssueBodySchema,
    LOAD_ITEM_CHECKED: checkItemPayloadSchema,
    LOADING_COMPLETED: completeLoadingPayloadSchema,
    LOCATION_PINGS: recordPingsPayloadSchema,
};

// the payload field that holds the time on the device, filled from the mutation's deviceTime when left out
export const DEVICE_TIME_FIELD = {
    TRIP_DEPARTED: "recordedAtDevice",
    STOP_EVENT: "recordedAtDevice",
    STOP_PROOF: "capturedAtDevice",
    ISSUE_REPORTED: "reportedAtDevice",
};

const mutationSchema = z.object({
    clientMutationId: clientId,
    type: z.enum(Object.keys(PAYLOAD_SCHEMAS)),
    deviceTime: isoDateTime,
    payload: z.record(z.string(), z.unknown()),
});

export const syncBatchSchema = z.object({
    body: z.object({
        deviceId: z.string().trim().min(1).max(100).optional(),
        // milliseconds to add to the device's clock to get server time
        clockOffsetMs: z.number().int().min(-86_400_000).max(86_400_000).optional(),
        mutations: z.array(mutationSchema).min(1).max(50),
    }),
});
