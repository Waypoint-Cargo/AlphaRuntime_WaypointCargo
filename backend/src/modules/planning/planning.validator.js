// Defines validation schemas for dispatch plans, trip allocations, stop sequencing, and manual overrides using Zod.
import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const id = z.string().trim().min(1).max(64);
const brand = z.string().trim().toUpperCase().pipe(z.enum(["FRESH", "STYLE", "TECH"]));

export const closePlanSchema = z.object({
	body: z.object({ depotId: id.optional(), deliveryDate: dateString }),
	query: z.object({}),
	params: z.object({}),
});

export const listPlansSchema = z.object({
	body: z.object({}),
	query: z.object({
		depotId: id.optional(),
		deliveryDate: dateString.optional(),
		status: z.enum(["OPEN", "CLOSED", "DRAFT", "PUBLISHED", "IN_EXECUTION", "COMPLETED"]).optional(),
	}),
	params: z.object({}),
});

export const planIdSchema = z.object({ body: z.object({}), query: z.object({}), params: z.object({ id }) });

export const planQueueSchema = z.object({
	body: z.object({}),
	query: z.object({
		filter: z.enum(["unplanned", "partial", "planned", "all"]).default("unplanned"),
		brand: brand.optional(),
		tempClass: z.enum(["AMBIENT", "CHILLED", "FROZEN"]).optional(),
		q: z.string().trim().max(120).optional(),
		sort: z.enum(["suggested", "windowEnd", "weight", "reference"]).default("suggested"),
		page: z.coerce.number().int().min(1).default(1),
		pageSize: z.coerce.number().int().min(1).max(100).default(50),
	}),
	params: z.object({ id }),
});

export const publishPlanSchema = z.object({
	body: z.object({
		// Orders still unplanned at publish time must be deferred explicitly; nothing is dropped silently.
		deferUnplanned: z.boolean().default(false),
		deferralReason: z.enum(["CAPACITY_UNAVAILABLE", "DELIVERY_WINDOW_CONFLICT", "VEHICLE_RESTRICTION", "FUEL_LIMITATION", "LOADING_SHORTFALL", "OTHER"]).default("CAPACITY_UNAVAILABLE"),
		note: z.string().trim().max(300).optional(),
	}),
	query: z.object({}),
	params: z.object({ id }),
});
