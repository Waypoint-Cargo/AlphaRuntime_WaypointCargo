import { z } from "zod";
import { Brand } from "../../generated/prisma/index.js";
import { clientId, idString, isoDate } from "../../utils/validation.js";

const quantity = z.number().int().min(0).max(1_000_000);

// every endpoint works on one business date, today when it is left out
const dateQuery = { date: isoDate.optional() };

export const loadingSummarySchema = z.object({
    query: z.object(dateQuery),
});

export const listLoadingTasksSchema = z.object({
    query: z.object({
        ...dateQuery,
        brand: z.enum(Brand).optional(),
        q: z.string().trim().min(1).max(100).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }),
});

export const loadingTripSchema = z.object({
    params: z.object({ tripId: idString }),
});

// The body of PATCH /loading/tasks/:tripId/items/:orderItemId. The offline sync endpoint validates its
// LOAD_ITEM_CHECKED payloads with the same body, plus the ids that the online endpoint takes from the path.
export const checkItemBodySchema = z.object({
    loadedQty: quantity,
    status: z.enum(["VERIFIED", "SHORT", "DAMAGED", "WRONG_ITEM"]).optional(),
    clientMutationId: clientId.optional(),
});

export const checkItemSchema = z.object({
    params: z.object({ tripId: idString, orderItemId: idString }),
    body: checkItemBodySchema,
});

export const checkItemPayloadSchema = checkItemBodySchema.extend({
    tripId: idString,
    orderItemId: idString,
});

// The body of POST /loading/tasks/:tripId/complete (and, with the trip id, the LOADING_COMPLETED payload).
export const completeLoadingBodySchema = z.object({
    departShort: z.boolean().default(false),
});

export const completeLoadingSchema = z.object({
    params: z.object({ tripId: idString }),
    body: completeLoadingBodySchema,
});

export const completeLoadingPayloadSchema = completeLoadingBodySchema.extend({
    tripId: idString,
});
