import winston from "winston";
import { config } from "./env.js";

const isProduction = config.nodeEnv === "production";

const formatTimestamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate(),
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
        d.getSeconds(),
    )}.${ms}`;
};

const consoleFormat = winston.format.printf((info) => {
    const requestId = info.requestId ? ` [${info.requestId}]` : "";
    return `${info.timestamp} ${info.level}${requestId}: ${info.message}`;
});

const timestampFormat = winston.format.timestamp({ format: formatTimestamp });

export const logger = winston.createLogger({
    level: config.logLevel,
    defaultMeta: { service: "auth-system-backend" },
    format: isProduction
        ? winston.format.combine(
            timestampFormat,
            winston.format.errors({ stack: true }),
            winston.format.json(),
        )
        : winston.format.combine(
            timestampFormat,
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            consoleFormat,
        ),
    transports: [new winston.transports.Console()],
});

export const httpLogStream = {
    write: (message) => {
        logger.info(message.trim());
    },
};

export default logger;


/**
 * HOW TO USE:
 *   logger.error("Something broke", { error: err.message });   //  Critical failures, always logged
 *   logger.warn("Something looks off", { userId });            //  Non-fatal issues worth attention
 *   logger.info("Server started on port 8000");                //  General lifecycle events
 *   logger.http("GET /health 200 4ms");                        //  HTTP request logs
 *   logger.debug("Token payload", { payload });                //  Detailed debug info (dev only)
 *
 * OUTPUT FORMAT:
 *   Development → colorized, human-readable console output
 *   Production  → structured JSON (for log aggregators like Datadog / Loki)
 */
