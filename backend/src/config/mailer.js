import nodemailer from "nodemailer";
import { config } from "./env.js";
import { logger } from "./logger.js";

let transporter = null;

// Returns the singleton SMTP transporter instance (lazy init, same pattern as getPrisma()).
export const getMailer = () => {
    if (!transporter) {
        if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
            logger.warn(
                "SMTP is not fully configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — emails will fail to send.",
            );
        }

        transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            auth: config.smtpUser
                ? { user: config.smtpUser, pass: config.smtpPassword }
                : undefined,
        });
    }
    return transporter;
};

// Verifies the SMTP connection/credentials. Call once at startup to fail fast
// on misconfiguration — never blocks server boot, only logs.
export const verifyMailer = async () => {
    if (!config.smtpHost) {
        logger.warn("Skipping SMTP verification — SMTP_HOST is not set.");
        return false;
    }

    try {
        await getMailer().verify();
        logger.info("SMTP connection verified.");
        return true;
    } catch (err) {
        logger.error("SMTP verification failed. Emails will not be deliverable.", {
            message: err.message,
        });
        return false;
    }
};
