import "dotenv/config";

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

    // 15 * 60 * 1000 = 1.5min 
    passwordResetExpiryInMs: parseInteger(process.env.PASSWORD_RESET_EXPIRY_MS, 900000),


    logLevel: process.env.LOG_LEVEL ?? (nodeEnv === "production" ? "info" : "debug"),
});