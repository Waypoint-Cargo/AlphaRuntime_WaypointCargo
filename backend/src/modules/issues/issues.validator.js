import { z } from "zod";
const id = z.string().min(1),
  types = z.enum([
    "MISSING_ITEM",
    "DAMAGED_ITEM",
    "WRONG_ITEM",
    "QUANTITY_MISMATCH",
    "QUANTITY_SHORT",
    "LATE_DELIVERY",
    "OUTLET_CLOSED",
    "VEHICLE_PROBLEM",
    "TRAFFIC_DELAY",
    "LOADING_SHORTFALL",
    "SYNC_CONFLICT",
    "OTHER",
  ]),
  statuses = z.enum(["OPEN", "INVESTIGATING", "RESOLVED"]),
  sources = z.enum([
    "LOADER",
    "DRIVER",
    "STORE_MANAGER",
    "DISPATCHER",
    "SYSTEM",
  ]),
  page = z.coerce.number().int().min(1).default(1),
  pageSize = z.coerce.number().int().min(1).max(100).default(25);
export const createSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z
    .object({
      type: types,
      orderId: id.optional(),
      tripId: id.optional(),
      stopId: id.optional(),
      orderItemId: id.optional(),
      expectedQty: z.number().int().min(0).optional(),
      actualQty: z.number().int().min(0).optional(),
      description: z.string().trim().max(1000).optional(),
      photoFileIds: z.array(id).max(5).default([]),
      clientMutationId: z.string().min(1).max(100).optional(),
      reportedAtDevice: z.coerce.date().optional(),
    })
    .refine((x) => x.orderId || x.tripId || x.stopId, {
      message: "At least one target is required",
    }),
});
export const listSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    status: statuses.optional(),
    source: sources.optional(),
    type: types.optional(),
    orderId: id.optional(),
    tripId: id.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page,
    pageSize,
  }),
});
export const idSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id }),
});
export const statusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id }),
  body: z.object({
    status: z.enum(["INVESTIGATING", "RESOLVED"]),
    resolutionNote: z.string().trim().max(1000).optional(),
  }),
});
