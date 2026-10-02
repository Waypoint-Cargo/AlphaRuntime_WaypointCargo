import nodemailer from "nodemailer";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

let transporter = null;

const isConfigured = () => Boolean(config.smtp.host);

const getTransporter = () => {
    if (!transporter) {
        const { host, port, secure, user, pass } = config.smtp;
        transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: user ? { user, pass } : undefined,
        });
    }
    return transporter;
};

// Sends one message. Throws on delivery failure so the caller (a background job) can retry.
// Without SMTP settings: development logs the message so flows stay testable,
// production refuses to send (and never logs the body, which holds secrets).
export const sendMail = async ({ to, subject, text, html }) => {
    if (!isConfigured()) {
        if (config.nodeEnv === "production") {
            throw new Error("SMTP is not configured (SMTP_HOST is empty).");
        }
        // the console format prints only the message, so the body goes in the message itself
        logger.info(`SMTP not configured - mail to ${to} not sent (development only).\nSubject: ${subject}\n${text}`);
        return;
    }

    await getTransporter().sendMail({ from: config.smtp.from, to, subject, text, html });
};
