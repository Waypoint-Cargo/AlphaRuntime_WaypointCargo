import { z } from "zod";
import { clientId, idString, isoDate, isoDateTime } from "../../utils/validation.js";

// the driver's day: today's business date unless another date is asked for
const dateQuery = z.object({
    query: z.object({ date: isoDate.optional() }),
});

export const todaySchema = dateQuery;
export const deliveriesSummarySchema = dateQuery;

// ---- depart ----

// The body of POST /deliveries/trips/:tripId/depart. The offline sync endpoint validates its TRIP_DEPARTED
// payloads with the same body plus the trip id the online endpoint takes from the path.
export const departBodySchema = z.object({
    recordedAtDevice: isoDateTime,
    clientMutationId: clientId.optional(),
});

export const departSchema = z.object({
    params: z.object({ tripId: idString }),
    body: departBodySchema,
});

export const departPayloadSchema = departBodySchema.extend({
    tripId: idString,
});

// ---- stop events ----

// The body of POST /deliveries/stops/:stopId/events (and, with the stop id, the STOP_EVENT sync payload).
export const stopEventBodySchema = z
    .object({
        type: z.enum(["ARRIVED", "UNLOADING_STARTED", "FAILED", "SKIPPED"]),
        recordedAtDevice: isoDateTime,
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        failureReason: z.string().trim().min(1).max(200).optional(),
        clientMutationId: clientId.optional(),
    })
    .superRefine((event, ctx) => {
        if (event.type === "FAILED" && !event.failureReason) {
            ctx.addIssue({ code: "custom", path: ["failureReason"], message: "A reason is required when the delivery failed." });
        }
        if ((event.lat === undefined) !== (event.lng === undefined)) {
            ctx.addIssue({ code: "custom", path: ["lat"], message: "Give lat and lng together." });
        }
    });

export const stopEventSchema = z.object({
    params: z.object({ stopId: idString }),
    body: stopEventBodySchema,
});

export const stopEventPayloadSchema = stopEventBodySchema.safeExtend({
    stopId: idString,
});

// ---- proof of delivery ----

const deliveredLine = z.object({
    orderItemId: idString,
    deliveredQty: z.number().int().min(0).max(1_000_000),
    note: z.string().trim().min(1).max(200).optional(),
});

// The body of POST /deliveries/stops/:stopId/proof (and, with the stop id, the STOP_PROOF sync payload).
export const proofBodySchema = z
    .object({
        receiverName: z.string().trim().min(1).max(100),
        signatureFileId: idString,
        photoFileIds: z.array(idString).max(5).default([]),
        allDeliveredAsPlanned: z.boolean(),
        lines: z.array(deliveredLine).min(1).max(500),
        capturedAtDevice: isoDateTime,
        clientMutationId: clientId.optional(),
    })
    .superRefine((proof, ctx) => {
        if (new Set(proof.lines.map((line) => line.orderItemId)).size !== proof.lines.length) {
            ctx.addIssue({ code: "custom", path: ["lines"], message: "Each order item can be listed once." });
        }
        if (new Set(proof.photoFileIds).size !== proof.photoFileIds.length) {
            ctx.addIssue({ code: "custom", path: ["photoFileIds"], message: "Each photo can be listed once." });
        }
        if (proof.photoFileIds.includes(proof.signatureFileId)) {
            ctx.addIssue({ code: "custom", path: ["photoFileIds"], message: "The signature cannot also be a photo." });
        }
    });

export const proofSchema = z.object({
    params: z.object({ stopId: idString }),
    body: proofBodySchema,
});

export const proofPayloadSchema = proofBodySchema.safeExtend({
    stopId: idString,
});
