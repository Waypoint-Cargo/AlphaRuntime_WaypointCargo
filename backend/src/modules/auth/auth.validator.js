import { z } from "zod";
import { Role } from "../../generated/prisma/index.js";

const sanitizedUsername = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(
        /^[a-z0-9_]+$/,
        'Username can only contain lowercase letters, numbers, and underscores'
    );

// the business login identifier, e.g. "epm_001" (stored and matched lowercase)
const sanitizedEmployeeNumber = z
    .string()
    .trim()
    .toLowerCase()
    .regex(
        /^[a-z0-9_]{3,20}$/,
        'Employee number must be 3-20 characters: letters, numbers and underscores only'
    );

const strongPassword = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    // Block null bytes and common injection sequences at the schema layer
    .refine(
        (val) => !/[\x00\x08\x1a]/.test(val),
        'Password contains invalid characters'
    );

const sanitizedEmail = z
    .string()
    .trim()
    .toLowerCase()
    .email('Must be a valid email address')
    .max(254, 'Email is too long');

// ADMIN accounts are never self-registered (the first one comes from the seed script)
const registrableRole = z.enum(
    [Role.DISPATCHER, Role.LOADER, Role.DRIVER, Role.STORE_MANAGER],
    { error: 'Role must be one of DISPATCHER, LOADER, DRIVER, STORE_MANAGER' },
);

// login schema
export const loginSchema = z.object({
    body: z.object({
        employeeNumber: sanitizedEmployeeNumber,
        password: z
            .string()
            .min(8, 'Invalid credentials')
            .max(128, 'Invalid credentials')
            .refine(
                (val) => !/[\x00\x08\x1a]/.test(val),
                'Invalid credentials'
            ),
        deviceId: z.string().trim().min(1).max(128).optional(),
    })
});


// Register schema
export const registerSchema = z.object({
    body: z.object({
        username: sanitizedUsername,
        email: sanitizedEmail,
        password: strongPassword,
        fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
        phone: z
            .string()
            .trim()
            .regex(/^\+?[0-9][0-9 ()-]{5,19}$/, 'Must be a valid phone number')
            .optional(),
        role: registrableRole,
        employeeNumber: sanitizedEmployeeNumber,
    })
});

// refresh / logout: web sends the refresh token as a cookie, mobile (X-Client: mobile) in the body
export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1).max(2048).optional(),
    }),
});

// forgot password schema
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: sanitizedEmail,
    }),
});

// reset password schema
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z
            .string()
            .min(1, 'Reset token is required')
            .max(128, 'Invalid reset token format'),

        newPassword: strongPassword,
    }),
});

// change password schema
export const changePasswordSchema = z.object({
    body: z
        .object({
            currentPassword: z.string().min(1, 'Current password is required').max(128, 'Invalid current password'),
            newPassword: strongPassword,
        })
        .refine((body) => body.currentPassword !== body.newPassword, {
            message: 'New password must be different from the current password',
            path: ['newPassword'],
        }),
});

// Google sign-in schema
export const googleSignInSchema = z.object({
    body: z.object({
        idToken: z
            .string()
            .min(1, 'Google ID token is required'),
    }),
});
