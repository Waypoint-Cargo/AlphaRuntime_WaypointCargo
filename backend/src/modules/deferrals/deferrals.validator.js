import { z } from "zod";
const id = z.string().min(1),
  date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reasons = z.enum([
    "CAPACITY_UNAVAILABLE",
    "DELIVERY_WINDOW_CONFLICT",
    "VEHICLE_RESTRICTION",
    "FUEL_LIMITATION",
    "LOADING_SHORTFALL",
    "OTHER",
  ]),
  statuses = z.enum(["PENDING_DECISION", "DEFERRED", "REPLANNED", "SERVED"]),
  page = z.coerce.number().int().min(1).default(1),
  pageSize = z.coerce.number().int().min(1).max(100).default(25);
export const createSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    orderId: id,
    reason: reasons.optional(),
    note: z.string().trim().max(500).optional(),
  }),
});
export const listSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    date: date.optional(),
    brand: z.enum(["FRESH", "STYLE", "TECH"]).optional(),
    status: statuses.optional(),
    depotId: id.optional(),
    q: z.string().trim().max(100).optional(),
    page,
    pageSize,
  }),
});
export const summarySchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({ date: date.optional(), depotId: id.optional() }),
});
export const historySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ outletId: id }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
export const idSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id }),
});
export const decisionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id }),
  body: z.object({
    reason: reasons,
    note: z.string().trim().max(500).optional(),
  }),
});
