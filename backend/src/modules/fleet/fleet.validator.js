import { z } from "zod";
import { VehicleType } from "../../generated/prisma/index.js";
import { booleanString, idParams, idString, isoDate, paginationQuery } from "../../utils/validation.js";

export const listFleetSchema = z.object({
    query: z.object({
        depotId: idString.optional(),
        type: z.enum(VehicleType).optional(),
        isRefrigerated: booleanString.optional(),
        isActive: booleanString.optional(),
        q: z.string().trim().min(1).max(100).optional(),
        ...paginationQuery,
    }),
});

export const fleetSummarySchema = z.object({
    query: z.object({ date: isoDate.optional() }),
});

export const getVehicleSchema = z.object({
    params: idParams,
    query: z.object({ date: isoDate.optional() }),
});

export const myVehicleSchema = z.object({
    query: z.object({ date: isoDate.optional() }),
});

export const updateVehicleSchema = z.object({
    params: idParams,
    body: z
        .object({
            isActive: z.boolean().optional(),
            statusNote: z.string().trim().max(500).nullable().optional(),
            defaultDriverId: idString.nullable().optional(),
        })
        .refine(
            (body) => Object.values(body).some((value) => value !== undefined),
            "Provide at least one field to update",
        ),
});
