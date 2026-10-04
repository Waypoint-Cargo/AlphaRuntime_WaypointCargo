import { z } from "zod";
const id = z.string().min(1),
  dt = z.coerce.date();
export const dateSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});
export const departSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ tripId: id }),
  body: z.object({
    recordedAtDevice: dt,
    clockOffsetMs: z.number().int().optional(),
    clientMutationId: z.string().min(1).max(100).optional(),
  }),
});
export const eventSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ stopId: id }),
  body: z
    .object({
      type: z.enum(["ARRIVED", "UNLOADING_STARTED", "FAILED", "SKIPPED"]),
      recordedAtDevice: dt,
      clockOffsetMs: z.number().int().optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      failureReason: z.string().trim().min(3).max(300).optional(),
      clientMutationId: z.string().min(1).max(100).optional(),
    })
    .superRefine((x, c) => {
      if ((x.lat == null) !== (x.lng == null))
        c.addIssue({
          code: "custom",
          message: "lat and lng must be provided together",
        });
      if (x.type === "FAILED" && !x.failureReason)
        c.addIssue({
          code: "custom",
          path: ["failureReason"],
          message: "failureReason is required for FAILED",
        });
    }),
});
export const proofSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ stopId: id }),
  body: z.object({
    receiverName: z.string().trim().min(2).max(100),
    signatureFileId: id,
    photoFileIds: z.array(id).max(5).default([]),
    allDeliveredAsPlanned: z.boolean(),
    lines: z
      .array(
        z.object({ orderItemId: id, deliveredQty: z.number().int().min(0) }),
      )
      .optional(),
    capturedAtDevice: dt,
    clockOffsetMs: z.number().int().optional(),
    clientMutationId: z.string().min(1).max(100).optional(),
  }),
});
