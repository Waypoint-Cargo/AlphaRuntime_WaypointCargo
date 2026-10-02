import { AppError } from "../utils/appError.js";
import { logger } from "../config/logger.js";
import { config } from "../config/env.js";

// Low-level PostgreSQL error as surfaced by the pg driver adapter, wherever Prisma puts it.
const getDriverCause = (err) =>
    err?.meta?.driverAdapterError?.cause ?? err?.cause ?? null;

const getSqlState = (err) => {
    const cause = getDriverCause(err);
    return cause?.originalCode ?? cause?.code ?? err?.meta?.code ?? (typeof err?.code === "string" && /^\d{5}$/.test(err.code) ? err.code : null);
};

const getSqlMessage = (err) => {
    const cause = getDriverCause(err);
    return cause?.originalMessage ?? cause?.message ?? err?.meta?.message ?? err?.message;
};

// Names the columns behind a unique / foreign-key violation.
// meta.target is set by the native engine; with the pg adapter only the constraint
// name is known ("User_employeeNumber_key", "Outlet_depotId_fkey"), so strip Prisma's naming.
const getConstraintFields = (err) => {
    const target = err?.meta?.target;
    if (Array.isArray(target)) return target;
    if (typeof target === "string") return [target];

    const cause = getDriverCause(err);
    const fields = cause?.constraint?.fields;
    if (Array.isArray(fields)) return fields;

    const index = cause?.constraint?.index ?? err?.meta?.field_name;
    if (typeof index !== "string") return [];

    const model = err?.meta?.modelName ?? cause?.table;
    let name = index.replace(/_(key|fkey|pkey)$/, "");
    if (model && name.startsWith(`${model}_`)) name = name.slice(model.length + 1);
    return name.split("_").filter(Boolean);
};

// Translates Prisma / PostgreSQL errors into operational AppErrors, in one place for every module.
// Returns null when the error is not a database error (it then goes through the normal path).
export const translateDatabaseError = (err) => {
    if (!err || err instanceof AppError) return null;

    if (err.code === "P2002") {
        const fields = getConstraintFields(err);
        return new AppError(
            fields.length
                ? `A record with this ${fields.join(", ")} already exists.`
                : "A record with these values already exists.",
            409,
            fields.map((field) => ({ field, message: "Already in use.", code: "unique" })),
        );
    }

    if (err.code === "P2025") {
        return new AppError("The requested record was not found.", 404);
    }

    if (err.code === "P2003") {
        const fields = getConstraintFields(err);
        return new AppError(
            "The request references a record that does not exist or is still in use.",
            409,
            fields.length ? fields.map((field) => ({ field, message: "Invalid reference.", code: "foreign_key" })) : null,
        );
    }

    // CHECK constraint or trigger violation (SQLSTATE 23514) — the database message is the rule text.
    if (getSqlState(err) === "23514") {
        return new AppError(getSqlMessage(err), 422);
    }

    return null;
};

export const errorHandler = (rawErr, req, res, next) => {
    const err = translateDatabaseError(rawErr) ?? rawErr;

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
