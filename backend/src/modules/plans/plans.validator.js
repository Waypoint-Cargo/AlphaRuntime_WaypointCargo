import { z } from "zod";
import { Brand, TempClass } from "../../generated/prisma/index.js";
import { idParams, idString, isoDate, paginationQuery } from "../../utils/validation.js";

export const closeOrdersSchema = z.object({
    body: z.object({
        depotId: idString,
        deliveryDate: isoDate,
    }),
});

export const listPlansSchema = z.object({
    query: z.object({
        depotId: idString.optional(),
        deliveryDate: isoDate.optional(),
        ...paginationQuery,
    }),
});

export const planIdSchema = z.object({ params: idParams });

export const planQueueSchema = z.object({
    params: idParams,
    query: z.object({
        filter: z.enum(["unplanned", "planned", "all"]).default("all"),
        brand: z.enum(Brand).optional(),
        tempClass: z.enum(TempClass).optional(),
        q: z.string().trim().min(1).max(100).optional(),
    }),
});
