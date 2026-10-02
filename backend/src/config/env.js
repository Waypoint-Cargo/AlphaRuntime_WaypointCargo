import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// the backend folder (two levels above src/config), used to resolve relative storage paths
const backendRoot = fileURLToPath(new URL("../../", import.meta.url));

const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const parseFloatValue = (value, fallback) => {
    const parsed = Number.parseFloat(value ?? "");
    return Number.isNaN(parsed) ? fallback : parsed;
};

const parseBoolean = (value, fallback) => {
    if (value === undefined || value === null) {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return fallback;
};

const parseAllowedOrigins = (value) =>
    value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

const nodeEnv = process.env.NODE_ENV ?? "development";

if (nodeEnv === "production") {
    const requiredKeys = [
        "DATABASE_URL",
        "ALLOWED_ORIGINS",
        "REDIS_URL",
    ];
    for (const key of requiredKeys) {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
    }
}

export const config = Object.freeze({
    nodeEnv,
    port: parseInteger(process.env.PORT, 8000),
    databaseUrl: process.env.DATABASE_URL ?? "",
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS ?? ""),

    gracefulShutdownTimeoutMs: parseInteger(
        process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
        15_000,
    ),

    redisUrl: process.env.REDIS_URL ?? "",
    rateLimitMaxRequests: parseInteger(
        process.env.RATE_LIMIT_MAX_REQUESTS,
        100,
    ),
    rateLimitWindowMs: parseInteger(
        process.env.RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000,
    ),

    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET ?? "",
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY ?? "15m",
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET ?? "",
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY ?? "7d",
    refreshTokenExpiryInMs: parseInteger(process.env.REFRESH_TOKEN_EXPIRY_MS, 7 * 24 * 60 * 60 * 1000),

    maxLoginAttempts: parseInteger(process.env.MAX_LOGIN_ATTEMPTS, 3),
    lockoutDurationMs: parseInteger(process.env.LOCKOUT_DURATION_MS, 15 * 60 * 1000),

    // 15 * 60 * 1000 = 15min
    passwordResetExpiryInMs: parseInteger(process.env.PASSWORD_RESET_EXPIRY_MS, 900000),

    // Where uploaded files (signatures, proof-of-delivery and issue photos) are kept on disk.
    // Relative paths are resolved against the backend folder. Back this folder up in production.
    fileStorageDir: path.resolve(backendRoot, process.env.FILE_STORAGE_DIR || "storage/uploads"),

    // Outgoing mail (password reset). Optional: when SMTP_HOST is empty the mailer
    // only logs the message in development and refuses to send in production.
    smtp: Object.freeze({
        host: process.env.SMTP_HOST ?? "",
        port: parseInteger(process.env.SMTP_PORT, 587),
        secure: parseBoolean(process.env.SMTP_SECURE, false),
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
        from: process.env.MAIL_FROM ?? "Waypoint Cargo <no-reply@waypointcargo.local>",
    }),

    logLevel: process.env.LOG_LEVEL ?? (nodeEnv === "production" ? "info" : "debug"),
});