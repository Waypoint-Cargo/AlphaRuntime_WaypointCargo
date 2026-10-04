import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const orderId = z.string().min(1).max(64);
const itemSchema = z.object({
	itemName: z.string().trim().min(1).max(120),
	sku: z.string().trim().max(40).optional(),
	unit: z.string().trim().max(20).default("EA"),
	quantity: z.number().int().positive().max(100000),
	weightKg: z.number().positive().max(20000),
	volumeM3: z.number().positive().max(100),
	notes: z.string().trim().max(300).optional(),
});

const status = z.enum([
	"DRAFT", "PENDING_REVIEW", "CONFIRMED", "DEFERRED", "PLANNED", "LOADED",
	"PARTIALLY_LOADED", "IN_TRANSIT", "DELIVERED", "PARTIALLY_DELIVERED",
	"RECEIVED", "RECEIVED_WITH_ISSUES", "FAILED", "CANCELLED",
]);

const pagination = {
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(250).default(20),
};

export const createOrderSchema = z.object({
	body: z.object({
		outletId: z.string().trim().optional(),
		tempClass: z.enum(["AMBIENT", "CHILLED", "FROZEN"]),
		requestedDeliveryDate: dateString,
		items: z.array(itemSchema).min(1).max(200),
		specialInstructions: z.string().trim().max(500).optional(),
		isFragile: z.boolean().default(false),
		isHighValue: z.boolean().default(false),
		submit: z.boolean().default(false),
	}),
	query: z.object({}),
	params: z.object({}),
});

export const listOrdersSchema = z.object({
	body: z.object({}),
	query: z.object({
		deliveryDate: dateString.optional(),
		status: z.string().transform((value) => value.split(",")).pipe(z.array(status)).optional(),
		brand: z.string().trim().toUpperCase().pipe(z.enum(["FRESH", "STYLE", "TECH"])).optional(),
		tempClass: z.enum(["AMBIENT", "CHILLED", "FROZEN"]).optional(),
		outletId: z.string().trim().max(64).optional(),
		depotId: z.string().trim().max(64).optional(),
		q: z.string().trim().max(120).optional(),
		sort: z.enum([
			"-createdAt", "createdAt",
			"deliveryDate", "-deliveryDate",
			"-totalWeightKg", "totalWeightKg",
			"outletName", "-outletName",
			"status",
		]).default("-createdAt"),
		...pagination,
	}),
	params: z.object({}),
});

export const orderIdSchema = z.object({
	body: z.object({}),
	query: z.object({}),
	params: z.object({ id: orderId }),
});

export const updateOrderSchema = z.object({
	body: z.object({
		version: z.number().int().min(0),
		tempClass: z.enum(["AMBIENT", "CHILLED", "FROZEN"]).optional(),
		requestedDeliveryDate: dateString.optional(),
		items: z.array(itemSchema).min(1).max(200).optional(),
		specialInstructions: z.string().trim().max(500).nullable().optional(),
		isFragile: z.boolean().optional(),
		isHighValue: z.boolean().optional(),
	}).refine((value) => Object.keys(value).some((key) => key !== "version"), "At least one order field is required."),
	query: z.object({}),
	params: z.object({ id: orderId }),
});

export const cancelOrderSchema = z.object({
	body: z.object({ reason: z.string().trim().max(300).optional() }),
	query: z.object({}),
	params: z.object({ id: orderId }),
});

export { dateString };
