// Background job: e-mail a password reset link.
// Fire-and-forget so the HTTP response never waits on (or reveals anything about) SMTP.
// In-process only (no queue): a failed send is retried a few times, then logged.
// If the process stops mid-retry the mail is lost and the user simply requests a new link.

import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { sendMail } from "../utils/mailer.js";

const RETRY_DELAYS_MS = [2_000, 10_000]; // 3 attempts in total

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const buildMessage = ({ fullName, resetUrl }) => {
    const minutes = Math.round(config.passwordResetExpiryInMs / 60_000);
    const text =
        `Hello ${fullName},\n\n` +
        `We received a request to reset your Waypoint Cargo password.\n` +
        `Open this link to choose a new password (valid for ${minutes} minutes, single use):\n\n${resetUrl}\n\n` +
        `If you did not request this, you can ignore this e-mail.`;
    const html =
        `<p>Hello ${escapeHtml(fullName)},</p>` +
        `<p>We received a request to reset your Waypoint Cargo password.</p>` +
        `<p><a href="${resetUrl}">Choose a new password</a> (valid for ${minutes} minutes, single use).</p>` +
        `<p>If you did not request this, you can ignore this e-mail.</p>`;
    return { subject: "Reset your Waypoint Cargo password", text, html };
};

const deliver = async ({ to, fullName, resetUrl }, attempt = 0) => {
    try {
        await sendMail({ to, ...buildMessage({ fullName, resetUrl }) });
    } catch (err) {
        if (attempt < RETRY_DELAYS_MS.length) {
            logger.warn("Password reset e-mail failed - will retry.", { attempt: attempt + 1, message: err.message });
            setTimeout(() => deliver({ to, fullName, resetUrl }, attempt + 1), RETRY_DELAYS_MS[attempt]);
            return;
        }
        logger.error("Password reset e-mail could not be delivered.", { message: err.message });
    }
};

// Schedules the e-mail and returns immediately; never throws.
export const enqueuePasswordResetEmail = (payload) => {
    setImmediate(() => {
        deliver(payload).catch((err) =>
            logger.error("Password reset e-mail job crashed.", { message: err.message }),
        );
    });
};
