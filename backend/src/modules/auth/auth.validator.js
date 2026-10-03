import { z } from "zod";
import { Role } from "../../generated/prisma/index.js";

const registrableRole = z.enum(
    [Role.DISPATCHER, Role.LOADER, Role.DRIVER, Role.STORE_MANAGER],
    { error: 'Role must be one of DISPATCHER, LOADER, DRIVER, STORE_MANAGER' },
);

// Login accepts either an employee number or an email address in the same field.
const loginIdentifier = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Employee number or email is required")
    .max(254, "Invalid employee number or email")
    .refine(
        (val) => !/[\x00\x08\x1a]/.test(val),
        "Employee number or email contains invalid characters",
    );

const strongPassword = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
    )
    // Block null bytes and common injection sequences at the schema layer
    .refine(
        (val) => !/[\x00\x08\x1a]/.test(val),
        "Password contains invalid characters",
    );

const sanitizedEmail = z
    .string()
    .trim()
    .toLowerCase()
    .email("Must be a valid email address")
    .max(254, "Email is too long");

// login schema
export const loginSchema = z.object({
    body: z.object({
        identifier: loginIdentifier,
        password: z
            .string()
            .min(8, "Invalid credentials")
            .max(128, "Invalid credentials")
            .refine(
                (val) => !/[\x00\x08\x1a]/.test(val),
                "Invalid credentials",
            ),
        deviceId: z.string().trim().min(1).max(128).optional(),
    }),
});

// Register schema
export const registerSchema = z.object({
    body: z.object({
        fullName: z
            .string()
            .trim()
            .min(2, "Full name must be at least 2 characters")
            .max(100, "Full name is too long"),
        email: sanitizedEmail,
        phone: z
            .string()
            .trim()
            .regex(/^\+?[0-9][0-9 ()-]{5,19}$/, "Must be a valid phone number")
            .optional(),
        password: strongPassword,
        role: registrableRole,
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1).max(2048).optional(),
    }),
});

// forgot password schema
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z
            .string()
            .email("Must be a valid email address")
            .max(254, "Email is too long"),
    }),
});

// reset password schema
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z
            .string()
            .min(1, "Reset token is required")
            .max(128, "Invalid reset token format"),

        newPassword: strongPassword,
    }),
});
