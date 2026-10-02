import { z } from "zod";
import { Brand, DeferralReason, DeferralStatus } from "../../generated/prisma/index.js";
import { idParams, idString, isoDate, paginationQuery } from "../../utils/validation.js";

const note = z.string().trim().min(1).max(1000);

export const createDeferralSchema = z.object({
    body: z.object({
        orderId: idString,
        reason: z.enum(DeferralReason).optional(),
        note: note.optional(),
    }),
});

export const decideDeferralSchema = z.object({
    params: idParams,
    body: z.object({
        reason: z.enum(DeferralReason),
        note: note.optional(),
    }),
});

export const deferralIdSchema = z.object({ params: idParams });

export const listDeferralsSchema = z.object({
    query: z.object({
        date: isoDate.optional(),
        brand: z.enum(Brand).optional(),
        status: z.enum(DeferralStatus).optional(),
        q: z.string().trim().min(1).max(100).optional(),
        ...paginationQuery,
    }),
});

export const deferralSummarySchema = z.object({
    query: z.object({ date: isoDate.optional() }),
});

export const outletHistorySchema = z.object({
    params: z.object({ outletId: idString }),
    query: z.object({ ...paginationQuery }),
});
