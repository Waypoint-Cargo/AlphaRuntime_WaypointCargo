import { z } from "zod";
import { Role } from "../../generated/prisma/index.js";

const employeeRole = z.enum(
    [Role.DISPATCHER, Role.LOADER, Role.DRIVER, Role.STORE_MANAGER],
    { error: "Role must be one of DISPATCHER, LOADER, DRIVER, STORE_MANAGER" },
);

const sanitizedId = z
    .string()
    .trim()
    .min(1, "Id is required")
    .max(40, "Invalid id format");

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

// GET /employees
export const listEmployeesSchema = z.object({
    query: z.object({
        role: employeeRole.optional(),
        isActive: booleanFlag,
        page,
        limit,
    }),
});

// GET /employees/pending
export const listPendingEmployeesSchema = z.object({
    query: z.object({
        page,
        limit,
    }),
});

// POST /employees/:userId/approve
export const approveEmployeeSchema = z.object({
    params: z.object({
        userId: sanitizedId,
    }),
});

// DELETE /employees/:userId
export const deleteEmployeeSchema = z.object({
    params: z.object({
        userId: sanitizedId,
    }),
});
