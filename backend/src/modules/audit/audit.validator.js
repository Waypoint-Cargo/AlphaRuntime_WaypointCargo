import { z } from "zod";

// ISO date or date-time. A date-only upper bound ("to") covers that whole day.
const isoInstant = (endOfDay = false) =>
    z
        .string()
        .trim()
        .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid ISO date or date-time")
        .transform((value) => {
            const date = new Date(value);
            if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
            return date;
        });

const optionalText = (max = 100) => z.string().trim().min(1).max(max).optional();

export const listAuditLogsSchema = z.object({
    query: z
        .object({
            entityType: optionalText(),
            entityId: optionalText(),
            actorId: optionalText(),
            action: optionalText(),
            from: isoInstant().optional(),
            to: isoInstant(true).optional(),
            page: z.coerce.number().int().min(1).default(1),
            pageSize: z.coerce.number().int().min(1).max(100).default(25),
        })
        .refine((query) => !query.from || !query.to || query.from <= query.to, {
            message: "'from' must not be after 'to'",
            path: ["to"],
        }),
});
