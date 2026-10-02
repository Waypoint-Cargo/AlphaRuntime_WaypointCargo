import { z } from "zod";
import { Brand } from "../../generated/prisma/index.js";
import { diffDays, isValidYmd } from "../../utils/businessTime.js";
import { booleanString, idParams, idString, isoDate, paginationQuery } from "../../utils/validation.js";

const MAX_CALENDAR_DAYS = 92;

// refinements also run when a date failed its own check, so guard against unparseable input
const spanDays = (query) => (isValidYmd(query.from) && isValidYmd(query.to) ? diffDays(query.from, query.to) : 0);

export const listOutletsSchema = z.object({
    query: z.object({
        depotId: idString.optional(),
        brand: z.enum(Brand).optional(),
        district: z.string().trim().min(1).max(100).optional(),
        isMall: booleanString.optional(),
        vanOnly: booleanString.optional(),
        q: z.string().trim().min(1).max(100).optional(),
        ...paginationQuery,
    }),
});

export const getOutletSchema = z.object({ params: idParams });

export const listCalendarSchema = z.object({
    query: z
        .object({ from: isoDate, to: isoDate })
        .refine((query) => spanDays(query) >= 0, {
            message: "'from' must not be after 'to'",
            path: ["to"],
        })
        .refine((query) => spanDays(query) + 1 <= MAX_CALENDAR_DAYS, {
            message: `The range can be at most ${MAX_CALENDAR_DAYS} days`,
            path: ["to"],
        }),
});

export const getCutoffSchema = z.object({
    query: z.object({ deliveryDate: isoDate.optional() }),
});
