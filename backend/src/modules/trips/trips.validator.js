import { z } from "zod";
import { idParams, idString, isoDate, paginationQuery } from "../../utils/validation.js";

const stopIdList = z.array(idString).min(1).max(500);

// either a plan, or a delivery date (optionally narrowed to one depot)
export const listTripsSchema = z.object({
    query: z
        .object({
            deliveryDate: isoDate.optional(),
            depotId: idString.optional(),
            planId: idString.optional(),
            ...paginationQuery,
        })
        .refine((query) => query.planId || query.deliveryDate, {
            message: "Provide planId, or deliveryDate (with an optional depotId)",
            path: ["deliveryDate"],
        }),
});

export const tripIdSchema = z.object({ params: idParams });

export const changeSequenceSchema = z.object({
    params: idParams,
    body: z.object({ stopIds: stopIdList }),
});

export const changeDriverSchema = z.object({
    params: idParams,
    body: z.object({ driverId: idString }),
});

export const createSequenceRequestSchema = z.object({
    params: idParams,
    body: z.object({
        proposedStopIds: stopIdList,
        reason: z.string().trim().min(1).max(500).optional(),
    }),
});

export const listSequenceRequestsSchema = z.object({
    params: idParams,
    query: z.object({ ...paginationQuery }),
});

export const decideSequenceRequestSchema = z.object({
    params: z.object({ requestId: idString }),
    body: z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }),
});
