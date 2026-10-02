import { z } from "zod";
import { VehicleType, VehicleStatus, TempClass } from "../../generated/prisma/index.js";

const vehicleType = z.enum(Object.values(VehicleType), {
    error: "Type must be one of REFRIGERATED_TRUCK, DRY_BOX_TRUCK, VAN",
});

const vehicleStatus = z.enum(Object.values(VehicleStatus), {
    error: "Status must be one of AVAILABLE, ASSIGNED, ON_ROUTE, MAINTENANCE",
});

const tempClass = z.enum(Object.values(TempClass), {
    error: "Temp class must be one of AMBIENT, CHILLED, FROZEN",
});

const sanitizedId = z
    .string()
    .trim()
    .min(1, "Id is required")
    .max(40, "Invalid id format");

const vehicleCode = z
    .string()
    .trim()
    .min(1, "Vehicle code is required")
    .max(20, "Vehicle code cannot exceed 20 characters")
    .toUpperCase();

const positiveDecimal = (label) =>
    z.coerce
        .number({ error: `${label} must be a number` })
        .positive(`${label} must be greater than 0`)
        .max(100_000, `${label} is unrealistically large`);

const optionalTemp = z.coerce
    .number({ error: "Temperature must be a number" })
    .min(-40, "Temperature cannot be below -40°C")
    .max(40, "Temperature cannot exceed 40°C")
    .optional();

const statusNote = z.string().trim().max(500, "Note cannot exceed 500 characters").optional();

const page = z.coerce
    .number({ error: "Page must be a number" })
    .int("Page must be a whole number")
    .min(1, "Page must be at least 1")
    .optional()
    .default(1);

const limit = z.coerce
    .number({ error: "Limit must be a number" })
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20);

// boolean query params arrive as the strings "true"/"false"
const booleanFlag = z
    .enum(["true", "false"], { error: "Must be 'true' or 'false'" })
    .transform((val) => val === "true")
    .optional();

const vehicleIdParams = z.object({ vehicleId: sanitizedId });

// shared body shape for create/update, refined per-schema below
const vehicleBodyFields = {
    code: vehicleCode,
    type: vehicleType,
    isRefrigerated: z.boolean({ error: "isRefrigerated must be true or false" }),
    tempMinC: optionalTemp,
    tempMaxC: optionalTemp,
    maxWeightKg: positiveDecimal("Weight capacity"),
    maxVolumeM3: positiveDecimal("Volume capacity"),
    fuelKmPerLitre: positiveDecimal("Fuel efficiency").optional(),
    weeklyFuelQuotaL: positiveDecimal("Weekly fuel quota"),
    homeDepotId: sanitizedId,
    defaultDriverId: sanitizedId.optional(),
    statusNote,
};

const temperatureRangeRefinement = (data, ctx) => {
    if (
        data.tempMinC !== undefined &&
        data.tempMaxC !== undefined &&
        data.tempMinC > data.tempMaxC
    ) {
        ctx.addIssue({
            code: "custom",
            message: "tempMinC cannot be greater than tempMaxC",
            path: ["tempMaxC"],
        });
    }
};

// POST /vehicles
export const createVehicleSchema = z.object({
    body: z.object(vehicleBodyFields).superRefine(temperatureRangeRefinement),
});

// PATCH /vehicles/:vehicleId
export const updateVehicleSchema = z.object({
    params: vehicleIdParams,
    body: z
        .object({
            ...vehicleBodyFields,
            code: vehicleCode.optional(),
            type: vehicleType.optional(),
            isRefrigerated: z.boolean().optional(),
            maxWeightKg: positiveDecimal("Weight capacity").optional(),
            maxVolumeM3: positiveDecimal("Volume capacity").optional(),
            weeklyFuelQuotaL: positiveDecimal("Weekly fuel quota").optional(),
            homeDepotId: sanitizedId.optional(),
            defaultDriverId: sanitizedId.nullable().optional(),
            isActive: z.boolean().optional(),
        })
        .superRefine(temperatureRangeRefinement),
});

// GET /vehicles
export const listVehiclesSchema = z.object({
    query: z.object({
        type: vehicleType.optional(),
        isRefrigerated: booleanFlag,
        depotId: sanitizedId.optional(),
        status: vehicleStatus.optional(),
        isActive: booleanFlag,
        search: z.string().trim().min(1).max(50).optional(),
        page,
        limit,
    }),
});

// GET /vehicles/available, /vehicles/in-route, /vehicles/maintenance
export const listByOperationalStateSchema = z.object({
    query: z.object({
        type: vehicleType.optional(),
        depotId: sanitizedId.optional(),
    }),
});

// GET /vehicles/compatible
export const listCompatibleVehiclesSchema = z.object({
    query: z.object({
        tempClass: tempClass.optional(),
        weightKg: z.coerce.number().positive("weightKg must be greater than 0").optional(),
        volumeM3: z.coerce.number().positive("volumeM3 must be greater than 0").optional(),
        depotId: sanitizedId.optional(),
        vanOnly: booleanFlag,
    }),
});

// GET /vehicles/:vehicleId
export const getVehicleSchema = z.object({
    params: vehicleIdParams,
});

// DELETE /vehicles/:vehicleId
export const deleteVehicleSchema = z.object({
    params: vehicleIdParams,
});

// PATCH /vehicles/:vehicleId/status
export const updateVehicleStatusSchema = z.object({
    params: vehicleIdParams,
    body: z.object({
        status: vehicleStatus,
        statusNote,
    }),
});

// POST /vehicles/:vehicleId/fuel-entries
export const createFuelEntrySchema = z.object({
    params: vehicleIdParams,
    body: z.object({
        litres: z.coerce
            .number({ error: "litres must be a number" })
            .positive("litres must be greater than 0")
            .max(10_000, "litres is unrealistically large"),
        distanceKm: z.coerce
            .number({ error: "distanceKm must be a number" })
            .nonnegative("distanceKm cannot be negative")
            .max(5_000, "distanceKm is unrealistically large")
            .optional()
            .default(0),
        note: z.string().trim().max(500, "Note cannot exceed 500 characters").optional(),
    }),
});
