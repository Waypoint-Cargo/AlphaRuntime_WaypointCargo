import { z } from "zod";
import { ReceiptStatus } from "../../generated/prisma/index.js";
import { idString } from "../../utils/validation.js";

const orderParams = z.object({ orderId: idString });

export const confirmReceiptSchema = z.object({
    params: orderParams,
    body: z.object({
        status: z.enum(ReceiptStatus),
        note: z.string().trim().min(1).max(1000).optional(),
    }),
});

export const orderProofSchema = z.object({
    params: orderParams,
});
