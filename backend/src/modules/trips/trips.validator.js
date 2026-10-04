import { z } from "zod";
const id = z.string().min(1);
const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(25);
export const listTripsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      planId: id.optional(),
      deliveryDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      depotId: id.optional(),
      status: z
        .enum([
          "PLANNED",
          "LOADING",
          "LOADED",
          "IN_TRANSIT",
          "COMPLETED",
          "CANCELLED",
        ])
        .optional(),
      page,
      pageSize,
    })
    .refine((q) => q.planId || q.deliveryDate, {
      message: "planId or deliveryDate is required",
    }),
});
export const tripIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id }),
});
export const reorderSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id }),
  body: z.object({
    stopIds: z
      .array(id)
      .min(1)
      .max(60)
      .refine((a) => new Set(a).size === a.length, "stopIds must be unique"),
  }),
});
export const driverSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id }),
  body: z.object({ driverId: id }),
});
export const requestSequenceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id }),
  body: z.object({
    proposedStopIds: z
      .array(id)
      .min(1)
      .max(60)
      .refine(
        (a) => new Set(a).size === a.length,
        "proposedStopIds must be unique",
      ),
    reason: z.string().trim().max(300).optional(),
  }),
});
export const decideSequenceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ requestId: id }),
  body: z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }),
});
