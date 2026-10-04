import { z } from "zod";

const id = z.string().trim().min(1).max(64);
const tripNumber = z.coerce.number().int().min(1).max(2); // "A vehicle can run up to two routes per day"

export const vehicleOptionsSchema = z.object({
	body: z.object({}),
	query: z.object({
		orderId: id,
		sort: z.preprocess(
			(val) => (typeof val === "string" ? val.toLowerCase() : val),
			z.enum(["recommended", "capacity"]).default("recommended")
		),
	}),
	params: z.object({}),
});

const allocationBody = z.object({
	orderId: id,
	vehicleId: id,
	tripNumber,
	// 1-based stop position for a NEW stop on the trip; omitted = append. Ignored when the outlet already has a stop.
	position: z.coerce.number().int().min(1).max(200).optional(),
});

export const validateAllocationSchema = z.object({ body: allocationBody, query: z.object({}), params: z.object({}) });

export const createAllocationSchema = z.object({
	body: allocationBody.extend({
		// WARN check codes the dispatcher has seen and accepted ("Allocate with warnings").
		acknowledgeWarnings: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
	}),
	query: z.object({}),
	params: z.object({}),
});

export const unallocateSchema = z.object({
	body: z.object({ reason: z.string().trim().max(300).optional() }),
	query: z.object({}),
	params: z.object({ orderId: id }),
});
