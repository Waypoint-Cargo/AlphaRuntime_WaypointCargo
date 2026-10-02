import { z } from "zod";
import { Brand, OrderStatus, TempClass } from "../../generated/prisma/index.js";
import { idParams, idString, isoDate, paginationQuery } from "../../utils/validation.js";

const itemSchema = z.object({
    itemName: z.string().trim().min(1).max(200),
    sku: z.string().trim().min(1).max(100).optional(),
    unit: z.string().trim().min(1).max(20).optional(),
    quantity: z.number().int().positive().max(1_000_000),
    // line totals (not per unit); the smallest storable values are 0.01 kg and 0.001 m3
    weightKg: z.number().min(0.01).max(99_999_999),
    volumeM3: z.number().min(0.001).max(9_999_999),
    notes: z.string().trim().max(500).optional(),
});

const items = z.array(itemSchema).min(1, "An order needs at least one item").max(200);

const specialInstructions = z.string().trim().max(1000);

// "CONFIRMED,PLANNED" -> ["CONFIRMED", "PLANNED"]
const statusList = z
    .string()
    .transform((value) => value.split(",").map((part) => part.trim()).filter(Boolean))
    .pipe(z.array(z.enum(OrderStatus)).min(1));

export const createOrderSchema = z.object({
    body: z.object({
        tempClass: z.enum(TempClass),
        requestedDeliveryDate: isoDate,
        items,
        specialInstructions: specialInstructions.optional(),
        isFragile: z.boolean().optional(),
        isHighValue: z.boolean().optional(),
        submit: z.boolean().default(false),
    }),
});

export const updateOrderSchema = z.object({
    params: idParams,
    body: z
        .object({
            version: z.number().int().min(0),
            tempClass: z.enum(TempClass).optional(),
            requestedDeliveryDate: isoDate.optional(),
            items: items.optional(),
            specialInstructions: specialInstructions.nullable().optional(),
            isFragile: z.boolean().optional(),
            isHighValue: z.boolean().optional(),
        })
        .refine(
            (body) => Object.entries(body).some(([key, value]) => key !== "version" && value !== undefined),
            "Provide at least one field to change",
        ),
});

export const orderIdSchema = z.object({ params: idParams });

export const cancelOrderSchema = z.object({
    params: idParams,
    body: z.object({ reason: z.string().trim().min(1).max(500).optional() }),
});

export const listOrdersSchema = z.object({
    query: z.object({
        deliveryDate: isoDate.optional(),
        status: statusList.optional(),
        brand: z.enum(Brand).optional(),
        tempClass: z.enum(TempClass).optional(),
        outletId: idString.optional(),
        q: z.string().trim().min(1).max(100).optional(),
        ...paginationQuery,
    }),
});

export const ordersSummarySchema = z.object({
    query: z.object({ deliveryDate: isoDate.optional() }),
});
