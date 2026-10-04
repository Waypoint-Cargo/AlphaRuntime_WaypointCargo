import { z } from "zod";
import { Brand } from "../../generated/prisma/index.js";

const sanitizedId = z
    .string()
    .trim()
    .min(1, "Id is required")
    .max(40, "Invalid id format");

// YYYY-MM-DD that is also a real calendar date (rejects 2026-13-45)
const isoDate = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Date is not a real calendar date");

const page = z.coerce
    .number({ error: "Page must be a number" })
    .int("Page must be a whole number")
    .min(1, "Page must be at least 1")
    .optional()
    .default(1);

const limit = z.coerce
    .number({ error: "Limit must be a number" })
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20);

const taskTab = z.enum(["pending", "completed"], {
    error: "Tab must be 'pending' or 'completed'",
});

const brand = z.enum(Object.values(Brand), {
    error: "Brand must be one of FRESH, STYLE, TECH",
});

// what the client last saw of the plan; a mismatch with the live plan is rejected (PLAN_CHANGED)
const planRevision = z
    .string()
    .trim()
    .min(1, "planRevision cannot be empty")
    .max(64, "Invalid planRevision");

// client-generated id so a retried request is recognised instead of being applied twice
const clientMutationId = z
    .string()
    .trim()
    .min(8, "clientMutationId must be at least 8 characters")
    .max(64, "clientMutationId cannot exceed 64 characters");

const tripIdParams = z.object({ tripId: sanitizedId });

const hasUniqueOrderItems = (lines) => new Set(lines.map((line) => line.orderItemId)).size === lines.length;

// one saved quantity: the absolute number loaded so far (not a delta)
const loadedLine = z.object({
    orderItemId: sanitizedId,
    loadedQty: z
        .number({ error: "loadedQty must be a number" })
        .int("loadedQty must be a whole number")
        .min(0, "loadedQty cannot be negative")
        .max(1_000_000, "loadedQty is unrealistically large"),
});

const shortfallType = z.enum(["MISSING", "DAMAGED", "WRONG_ITEM"], {
    error: "Type must be one of MISSING, DAMAGED, WRONG_ITEM",
});

// one line the loader cannot load in full: how many units are short, and why
const shortfallLine = z.object({
    orderItemId: sanitizedId,
    type: shortfallType,
    shortQty: z
        .number({ error: "shortQty must be a number" })
        .int("shortQty must be a whole number")
        .min(1, "shortQty must be at least 1")
        .max(1_000_000, "shortQty is unrealistically large"),
    note: z.string().trim().max(160, "Note cannot exceed 160 characters").optional(),
});

// GET /loading/summary
export const homeSummarySchema = z.object({
    query: z.object({
        date: isoDate.optional(),
    }),
});

// GET /loading/tasks
export const listTasksSchema = z.object({
    query: z.object({
        tab: taskTab.optional().default("pending"),
        search: z.string().trim().min(1).max(50).optional(),
        brand: brand.optional(),
        date: isoDate.optional(),
        page,
        limit,
    }),
});

// GET /loading/issues
export const listIssuesSchema = z.object({
    query: z.object({
        tab: z.enum(["pending", "resolved"], { error: "Tab must be 'pending' or 'resolved'" }).optional().default("pending"),
        limit: z.coerce
            .number({ error: "Limit must be a number" })
            .int("Limit must be a whole number")
            .min(1, "Limit must be at least 1")
            .max(100, "Limit cannot exceed 100")
            .optional()
            .default(50),
    }),
});

// GET /loading/tasks/:tripId, GET /loading/tasks/:tripId/summary, POST /loading/tasks/:tripId/start, POST /loading/tasks/:tripId/pause
export const taskIdSchema = z.object({
    params: tripIdParams,
});

// PATCH /loading/tasks/:tripId/lines
export const updateTaskLinesSchema = z.object({
    params: tripIdParams,
    body: z.object({
        lines: z
            .array(loadedLine)
            .min(1, "At least one line is required")
            .max(100, "At most 100 lines can be saved at once")
            .refine(hasUniqueOrderItems, "Each order line can appear only once"),
        planRevision: planRevision.optional(),
    }),
});

// POST /loading/tasks/:tripId/shortfall
export const reportShortfallSchema = z.object({
    params: tripIdParams,
    body: z.object({
        lines: z
            .array(shortfallLine)
            .min(1, "Select at least one line that is short")
            .max(25, "At most 25 lines can be reported at once")
            .refine(hasUniqueOrderItems, "Each order line can appear only once"),
        reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
        clientMutationId: clientMutationId.optional(),
    }),
});

// POST /loading/tasks/:tripId/complete
export const completeTaskSchema = z.object({
    params: tripIdParams,
    body: z.object({
        planRevision: planRevision.optional(),
    }),
});
