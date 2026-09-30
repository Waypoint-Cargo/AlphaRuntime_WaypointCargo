import { AppError } from "../utils/appError.js";
import { logger } from "../config/logger.js";
import { config } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
    const isProd = config.nodeEnv === "production";
    const isTrusted = err instanceof AppError && err.isOperational;

    const statusCode = isTrusted
        ? err.statusCode
        : typeof err.statusCode === "number" && err.statusCode >= 100 && err.statusCode < 600
          ? err.statusCode
          : 500;

    const message = isTrusted
        ? err.message
        : isProd
          ? "An unexpected error occurred. Please try again later."
          : err.message;

    const details = isTrusted
        ? (err.details ?? null)
        : isProd
          ? null
          : { stack: err.stack };

    if (statusCode >= 500) {
        logger.error(`Unhandled exception on ${req.method} ${req.originalUrl || req.path} | Status: ${statusCode} | Error: ${err.message}`, {
            stack: err.stack,
            requestId: res.locals.requestId ?? null
        });
    } else {
        logger.warn(`Client error: ${message}`, {
            statusCode,
            requestId: res.locals.requestId ?? null,
        });
    }

    const body = {
        success: false,
        message,
        details,
        requestId: res.locals.requestId ?? null,
    };
    if (body.details === null) delete body.details;

    return res.status(statusCode).json(body);
};
