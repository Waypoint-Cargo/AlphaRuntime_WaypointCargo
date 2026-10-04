import { z } from "zod";

// Reusable field schemas
const emailField = z
   .string()
   .trim()
   .min(1, "Email is required")
   .email("Enter a valid email address")
   .transform((v) => v.toLowerCase());

// Strong password — mirrors the backend Zod validator exactly
const strongPasswordField = z
   .string()
   .min(8, "Password must be at least 8 characters")
   .max(128, "Password is too long")
   .regex(/[A-Z]/, "Must contain at least one uppercase letter")
   .regex(/[a-z]/, "Must contain at least one lowercase letter")
   .regex(/\d/, "Must contain at least one number")
   .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

// Login — the backend takes one `identifier` field: an employee number OR an email
export const loginSchema = z.object({
   identifier: z
      .string()
      .trim()
      .min(3, "Enter your employee number or email")
      .max(254, "Employee number or email is too long"),
   password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
});

// Forgot password
export const forgotPasswordSchema = z.object({
   email: emailField,
});

// Reset password
export const resetPasswordSchema = z
   .object({
      newPassword: strongPasswordField,
      confirmPassword: z.string().min(1, "Please confirm your password"),
   })
   .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
   });

// Password strength helper (used by PasswordStrengthBar)
export function getPasswordStrength(password) {
   const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
   ];
   const score = checks.filter(Boolean).length;
   const level =
      score <= 1
         ? "weak"
         : score <= 3
           ? "fair"
           : score === 4
             ? "good"
             : "strong";
   const colorMap = {
      weak: "var(--color-danger)",
      fair: "var(--color-warning)",
      good: "hsl(180, 60%, 50%)",
      strong: "var(--color-success)",
   };
   return { score, level, color: colorMap[level] };
}


// values are the backend `Role` enum names (auth.validator.js registrableRole)
export const ROLE_OPTIONS = [
    { value: "DISPATCHER", label: "Dispatcher" },
    { value: "LOADER", label: "Loader" },
    { value: "DRIVER", label: "Driver" },
    { value: "STORE_MANAGER", label: "Store manager" },
];

export const registerAccountSchema = z
    .object({
        fullName: z.string().trim().min(2, "Enter your full name").max(100, "Full name is too long"),
        email: emailField,
        countryCode: z.string(),
        phone: z
            .string()
            .transform((v) => v.replace(/[\s-]/g, ""))
            .pipe(z.string().regex(/^[1-9]\d{8}$/, "Enter a 9-digit mobile number, e.g. 77 123 4567")),
        password: strongPasswordField,
        confirmPassword: z.string().min(1, "Please confirm your password"),
        role: z.enum(
            ROLE_OPTIONS.map((r) => r.value),
            { errorMap: () => ({ message: "Select your role" }) },
        ),
        terms: z.literal(true, {
            errorMap: () => ({ message: "You must accept the terms to continue" }),
        }),
    })
    .refine((d) => d.password === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match",
    });