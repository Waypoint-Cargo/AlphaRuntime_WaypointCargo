import { z } from "zod";
import { idString, isoDate, isoDateTime } from "../../utils/validation.js";

const ping = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    speedKmh: z.number().min(0).max(300).optional(),
    recordedAt: isoDateTime,
});

// The body of POST /tracking/trips/:tripId/pings. The offline sync endpoint validates its LOCATION_PINGS
// payloads with the same body plus the trip id the online endpoint takes from the path.
export const pingsBodySchema = z.object({
    pings: z.array(ping).min(1).max(100),
});

export const recordPingsSchema = z.object({
    params: z.object({ tripId: idString }),
    body: pingsBodySchema,
});

export const recordPingsPayloadSchema = pingsBodySchema.extend({
    tripId: idString,
});

export const liveTrackingSchema = z.object({
    query: z.object({ date: isoDate.optional() }),
});

export const tripTrackingSchema = z.object({
    params: z.object({ tripId: idString }),
});
