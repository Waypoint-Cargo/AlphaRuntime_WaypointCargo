import { z } from "zod";
import { idString } from "../../utils/validation.js";

// the trip-per-day limit (2) is a business check, not an input rule: a third trip must come back
// as an explained TRIP_LIMIT failure, so the number is only bounded loosely here
const tripNumber = z.number().int().min(1).max(9);

export const vehicleOptionsSchema = z.object({
    query: z.object({
        orderId: idString,
        sort: z.enum(["recommended", "capacity"]).default("recommended"),
    }),
});

export const validateAllocationSchema = z.object({
    body: z.object({
        orderId: idString,
        vehicleId: idString,
        tripNumber,
    }),
});

export const allocateSchema = z.object({
    body: z.object({
        orderId: idString,
        vehicleId: idString,
        tripNumber,
        position: z.number().int().min(1).max(500).optional(),
        acknowledgeWarnings: z.array(z.string().min(1).max(60)).max(20).default([]),
    }),
});

export const unallocateSchema = z.object({
    params: z.object({ orderId: idString }),
});
