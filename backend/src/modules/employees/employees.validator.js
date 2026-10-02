import { z } from "zod";
import { OutletStaffRole } from "../../generated/prisma/index.js";
import { booleanString, idParams, paginationQuery } from "../../utils/validation.js";

const fullName = z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long");

// stored lower case, so the same address cannot be added twice with different capitals
const email = z.string().trim().toLowerCase().email("Must be a valid email address").max(254, "Email is too long");

const phone = z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{5,19}$/, "Must be a valid phone number");

export const listEmployeesSchema = z.object({
    query: z.object({
        role: z.enum(OutletStaffRole).optional(),
        isActive: booleanString.optional(),
        q: z.string().trim().min(1).max(100).optional(),
        ...paginationQuery,
    }),
});

export const createEmployeeSchema = z.object({
    body: z.object({
        fullName,
        email: email.optional(),
        phone: phone.optional(),
        role: z.enum(OutletStaffRole),
        isActive: z.boolean().optional(),
    }),
});

// email and phone can be cleared with null
export const updateEmployeeSchema = z.object({
    params: idParams,
    body: z
        .object({
            fullName: fullName.optional(),
            email: email.nullable().optional(),
            phone: phone.nullable().optional(),
            role: z.enum(OutletStaffRole).optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.values(body).some((value) => value !== undefined), "Provide at least one field to change"),
});
