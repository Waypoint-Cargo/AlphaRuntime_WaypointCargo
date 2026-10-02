const brandHeader = (title) => `
    <div style="background-color:#0f172a;padding:24px 32px;border-radius:8px 8px 0 0;">
        <span style="color:#ffffff;font-size:18px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">Waypoint Cargo</span>
    </div>
    <div style="padding:32px;background-color:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
`;

const brandFooter = `
    </div>
    <p style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;font-size:12px;margin:16px 32px;">
        This is an automated message — please do not reply to this email.
    </p>
`;

const button = (href, label) => `
    <a href="${href}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;
        padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin:16px 0;">${label}</a>
`;

// Password reset link — the only email a user requests themselves.
export const passwordResetTemplate = ({ fullName, resetUrl, expiryMinutes }) => ({
    subject: "Reset your Waypoint Cargo password",
    html: `
        ${brandHeader("Reset your password")}
        <p style="font-size:14px;line-height:1.6;">Hi ${fullName},</p>
        <p style="font-size:14px;line-height:1.6;">
            We received a request to reset your Waypoint Cargo password. Click the button below to
            choose a new one. This link expires in ${expiryMinutes} minutes.
        </p>
        <p>${button(resetUrl, "Reset password")}</p>
        <p style="font-size:12px;line-height:1.6;color:#64748b;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a>
        </p>
        <p style="font-size:14px;line-height:1.6;">
            If you didn't request this, you can safely ignore this email — your password will not change.
        </p>
        ${brandFooter}
    `,
    text:
        `Hi ${fullName},\n\n` +
        `We received a request to reset your Waypoint Cargo password. Open the link below to choose a new one ` +
        `(expires in ${expiryMinutes} minutes):\n${resetUrl}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
});

// A single row in the approval email's details table.
const detailRow = (label, value) => `
    <tr>
        <td style="padding:6px 0;font-size:13px;color:#64748b;white-space:nowrap;">${label}</td>
        <td style="padding:6px 0 6px 16px;font-size:14px;font-weight:600;color:#0f172a;">${value}</td>
    </tr>
`;

// Account approval notice — sent once a Store Manager approves a self sign-up.
export const accountApprovedTemplate = ({ fullName, email, employeeNumber, role, outlet }) => ({
    subject: "Your Waypoint Cargo account has been approved",
    html: `
        ${brandHeader("Account approved")}
        <p style="font-size:14px;line-height:1.6;">Hi ${fullName},</p>
        <p style="font-size:14px;line-height:1.6;">
            Good news — your Waypoint Cargo account has been approved. Here are your account details:
        </p>
        <table style="border-collapse:collapse;margin:8px 0 20px;">
            ${detailRow("Employee number", employeeNumber)}
            ${detailRow("Role", role)}
            ${detailRow("Outlet", `${outlet.name} (${outlet.code})`)}
            ${detailRow("District", outlet.district)}
        </table>
        <p style="font-size:14px;line-height:1.6;">
            To sign in, use the <strong>same password you created when you registered</strong> —
            there's nothing new to set up. You can log in with either:
        </p>
        <ul style="font-size:14px;line-height:1.6;padding-left:20px;">
            <li>Your employee number: <strong>${employeeNumber}</strong></li>
            <li>Your email address: <strong>${email}</strong></li>
        </ul>
        ${brandFooter}
    `,
    text:
        `Hi ${fullName},\n\n` +
        `Good news — your Waypoint Cargo account has been approved. Here are your account details:\n\n` +
        `Employee number: ${employeeNumber}\n` +
        `Role: ${role}\n` +
        `Outlet: ${outlet.name} (${outlet.code})\n` +
        `District: ${outlet.district}\n\n` +
        `To sign in, use the same password you created when you registered. ` +
        `You can log in with either your employee number (${employeeNumber}) or your email address (${email}).`,
});
