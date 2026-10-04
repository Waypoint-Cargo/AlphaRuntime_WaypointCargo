import { z } from "zod";

const sanitizedId = z.string().trim().min(1).max(40);

export const createPingSchema = z.object({
    body: z.object({
        tripId: sanitizedId,
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        speedKmh: z.coerce.number().min(0).optional(),
        recordedAt: z.coerce.date()
    })
});

export const getTripHistorySchema = z.object({
    params: z.object({
        tripId: sanitizedId
    })
});
