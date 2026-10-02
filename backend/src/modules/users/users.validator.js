import { z } from "zod";
import { Role } from "../../generated/prisma/index.js";

const id = z.string().min(1);
const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const idParams = z.object({ id });

// role + scope of a user; the combination rules are enforced in the service
const accessBody = z.object({
    role: z.enum(Role),
    outletId: id.optional(),
    depotIds: z.array(id).max(50).optional(),
});

export const listUsersSchema = z.object({
    query: z.object({
        role: z.enum(Role).optional(),
        isApproved: booleanString.optional(),
        isActive: booleanString.optional(),
        q: z.string().trim().min(1).max(100).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }),
});

export const getUserSchema = z.object({ params: idParams });

export const approveUserSchema = z.object({ params: idParams, body: accessBody });

export const changeUserScopeSchema = z.object({ params: idParams, body: accessBody });

export const setUserStatusSchema = z.object({
    params: idParams,
    body: z.object({ isActive: z.boolean() }),
});

export const updateMeSchema = z.object({
    body: z
        .object({
            fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100).optional(),
            phone: z
                .string()
                .trim()
                .regex(/^\+?[0-9][0-9 ()-]{5,19}$/, "Must be a valid phone number")
                .nullable()
                .optional(),
            avatarUrl: z
                .string()
                .trim()
                .max(2048)
                .regex(/^https?:\/\//i, "Must be an http(s) URL")
                .nullable()
                .optional(),
        })
        .refine(
            (body) => Object.values(body).some((value) => value !== undefined),
            "Provide at least one field to update",
        ),
});
