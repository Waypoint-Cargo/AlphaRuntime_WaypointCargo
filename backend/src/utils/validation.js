import { z } from "zod";
import { isValidYmd } from "./businessTime.js";

// Zod building blocks shared by the validators of prompt-2 modules.

// cuid string (never .uuid())
export const idString = z.string().min(1);

// calendar date "YYYY-MM-DD"
export const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format")
    .refine(isValidYmd, "Not a valid calendar date");

// "true" / "false" in a query string
export const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

// ?page=&pageSize= (default 1 / 25, max 100)
export const paginationQuery = {
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

export const idParams = z.object({ id: idString });

// ---- prompt 3 (field work and sync) ----

// ISO-8601 timestamp with a UTC offset ("2026-10-02T08:15:00+05:30" or "...Z"), parsed to a Date
export const isoDateTime = z.iso
    .datetime({ offset: true, message: "Must be an ISO-8601 date-time with an offset, e.g. 2026-10-02T08:15:00+05:30" })
    .transform((value) => new Date(value));

// an id the client invents for offline work (clientMutationId, clientFileId)
export const clientId = z.string().trim().min(1).max(100);
