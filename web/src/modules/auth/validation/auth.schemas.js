import { z } from "zod";
import { USERNAME_CONSTRAINTS } from "@/constants/app.constants";

// Reusable field schemas
const usernameField = z
   .string()
   .min(
      USERNAME_CONSTRAINTS.MIN,
      `Username must be at least ${USERNAME_CONSTRAINTS.MIN} characters`,
   )
   .max(
      USERNAME_CONSTRAINTS.MAX,
      `Username must be at most ${USERNAME_CONSTRAINTS.MAX} characters`,
   )
   .regex(
      USERNAME_CONSTRAINTS.PATTERN,
      "Only lowercase letters, numbers, and underscores allowed",
   )
   .transform((v) => v.toLowerCase());

const emailField = z
   .string()
   .min(1, "Email is required")
   .email("Enter a valid email address")
   .transform((v) => v.toLowerCase());

// Strong password — mirrors the backend Zod validator exactly
const strongPasswordField = z
   .string()
   .min(8, "Password must be at least 8 characters")
   .regex(/[A-Z]/, "Must contain at least one uppercase letter")
   .regex(/[a-z]/, "Must contain at least one lowercase letter")
   .regex(/\d/, "Must contain at least one number")
   .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

// Login
export const loginSchema = z.object({
   username: z.string().min(1, "Username is required"),
   password: z.string().min(1, "Password is required"),
});

// Register
export const registerFormSchema = z
   .object({
      username: usernameField,
      email: emailField,
      password: strongPasswordField,
      confirmPassword: z.string().min(1, "Please confirm your password"),
   })
   .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
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


export const ROLE_OPTIONS = [
    { value: "dispatcher", label: "Dispatcher" },
    { value: "loader", label: "Loader" },
    { value: "driver", label: "Driver" },
    { value: "store_manager", label: "Store manager" },
];

export const registerAccountSchema = z
    .object({
        fullName: z.string().trim().min(2, "Enter your full name"),
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