import { getMailer } from "../../config/mailer.js";
import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { accountApprovedTemplate, passwordResetTemplate } from "./email.templates.js";


const sendMail = async ({ to, subject, html, text }) => {
    try {
        await getMailer().sendMail({
            from: `"${config.mailFromName}" <${config.mailFromAddress}>`,
            to,
            subject,
            html,
            text,
        });
        return true;
    } catch (err) {
        logger.error("Failed to send email.", { to, subject, message: err.message });
        return false;
    }
};

// Sends the password reset link requested via POST /auth/forgot-password.
export const sendPasswordResetEmail = async (user, resetUrl) => {
    const expiryMinutes = Math.round(config.passwordResetExpiryInMs / 60_000);
    const { subject, html, text } = passwordResetTemplate({
        fullName: user.fullName,
        resetUrl,
        expiryMinutes,
    });

    return sendMail({ to: user.email, subject, html, text });
};

// Sends the account approved email after a Store Manager approves a user.
export const sendAccountApprovedEmail = async (user) => {
    const { subject, html, text } = accountApprovedTemplate({
        fullName: user.fullName,
        email: user.email,
        employeeNumber: user.employeeNumber,
        role: user.role,
    });

    return sendMail({ to: user.email, subject, html, text });
};
