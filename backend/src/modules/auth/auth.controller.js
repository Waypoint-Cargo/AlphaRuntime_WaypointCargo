import { sendSuccess } from "../../utils/apiResponse.js";
import {
    forgotPasswordService,
    loginService,
    logoutAllService,
    logoutService,
    refreshTokenService,
    registerService,
    resetPasswordService,
} from "./auth.service.js";
import { config } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "strict" : "lax",
    maxAge: config.refreshTokenExpiryInMs,
    path: "/api/auth",
};

export const COOKIE_NAME =
    config.nodeEnv === "production" ? "__Secure-refreshToken" : "refreshToken";

// The Flutter app cannot use cookies: it sends `X-Client: mobile` and keeps the
// refresh token itself (returned in the response body, sent back in the request body).
// Browsers never send this header (it is not in the CORS allow-list), so they keep the cookie flow.
const isMobileClient = (req) => req.get("x-client")?.toLowerCase() === "mobile";

// request metadata stored with a refresh token
const clientInfo = (req) => ({
    userAgent: req.get("user-agent")?.slice(0, 255),
    ip: req.ip,
});

// Sends a session: mobile gets the refresh token in the body, web gets it as an httpOnly cookie.
const sendSession = (req, res, { statusCode = 200, message, result }) => {
    const { refreshToken, ...safeResult } = result;

    if (isMobileClient(req)) {
        return sendSuccess(res, {
            statusCode,
            message,
            data: { ...safeResult, refreshToken },
        });
    }

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    return sendSuccess(res, { statusCode, message, data: safeResult });
};

// Where the refresh token comes from. The cookie flow also needs the custom header (CSRF defence).
const readRefreshToken = (req) => {
    if (isMobileClient(req)) return req.body?.refreshToken;

    if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
        throw new AppError("Forbidden", 403);
    }
    return req.cookies?.[COOKIE_NAME];
};

// catchAsync wraps this function  → any thrown error goes to errorHandler
export const loginController = async (req, res) => {
    const { identifier, password, deviceId } = req.body;

    const result = await loginService({
        identifier,
        password,
        deviceId,
        ...clientInfo(req),
    });

    return sendSession(req, res, { message: "Login successful.", result });
};

export const registerController = async (req, res) => {
    const { fullName, email, password, phone, role } = req.body;

    const result = await registerService({
        fullName,
        email,
        password,
        phone,
        role,
    });

    return sendSuccess(res, {
        statusCode: 201,
        message:
            "Registration received. An administrator must approve your account before you can sign in.",
        data: result,
    });
};

export const refreshController = async (req, res) => {
    const rawToken = readRefreshToken(req);

    if (!rawToken) {
        throw new AppError("No refresh token provided.", 401);
    }

    let result;

    try {
        result = await refreshTokenService({ rawToken, ...clientInfo(req) });
    } catch (err) {
        if (!isMobileClient(req)) res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
        throw err; // re throw for the global error handler
    }

    return sendSession(req, res, {
        message: "Token refreshed successfully.",
        result,
    });
};

export const logoutController = async (req, res) => {
    const rawToken = readRefreshToken(req);

    const authHeader = req.headers["authorization"];
    const accessToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!rawToken || !accessToken) {
        throw new AppError("No refresh token or access token provided.", 401);
    }

    await logoutService({ rawToken, accessToken });

    // Always clear the cookie — even if the DB record was already gone.
    // This ensures the client is fully logged out no matter what.
    if (!isMobileClient(req)) res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

    return sendSuccess(res, {
        statusCode: 200,
        message: "Logged out successfully.",
        data: null,
    });
};

export const logoutAllController = async (req, res) => {
    const { id: userId } = req.user;

    await logoutAllService({
        userId,
        accessToken: req.accessToken,
    });

    // Clear the refresh token cookie for the current device as well
    if (!isMobileClient(req)) res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

    return sendSuccess(res, {
        statusCode: 200,
        message: 'Logged out from all devices successfully.',
        data: null,
    });
};

export const forgotPasswordController = async (req, res) => {
    const { email } = req.body;

    await forgotPasswordService({ email });

    return sendSuccess(res, {
        statusCode: 200,
        message:
            "If an account with that email address exists, a password reset link has been sent.",
        data: null,
    });
};

export const resetPasswordController = async (req, res) => {
    const { token, newPassword } = req.body;

    await resetPasswordService({ token, newPassword });

    return sendSuccess(res, {
        statusCode: 200,
        message:
            "Password reset successfully. Please log in with your new password.",
        data: null,
    });
};
