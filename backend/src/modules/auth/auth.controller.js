import { sendSuccess } from "../../utils/apiResponse.js";
import { forgotPasswordService, loginService, logoutAllService, logoutService, refreshTokenService, registerService, resetPasswordService } from "./auth.service.js";
import { config } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";

//   httpOnly: true  → JS cannot access this cookie via document.cookie (XSS-safe)
//   secure: true    → Cookie is only sent over HTTPS (set to false in dev only)
//   sameSite: 'strict' → Cookie is NOT sent on cross-site requests at all.
//                        This is the primary CSRF defense for the cookie.
//   path: '/api/auth/refresh' → Scoped to the refresh path only.
//                               The browser will ONLY send this cookie to that
//                               specific route, not to /login or any other endpoint.
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "strict" : "lax",
    maxAge: config.refreshTokenExpiryInMs,
    path: "/api/auth",
};

export const COOKIE_NAME = config.nodeEnv === 'production'
    ? '__Secure-refreshToken'
    : 'refreshToken';

// catchAsync wraps this function  → any thrown error goes to errorHandler
export const loginController = async (req, res) => {
    const { username, password } = req.body;

    const result = await loginService({ username, password });

    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS)

    // remove refresh token from result
    const { refreshToken, ...safeResult } = result;

    return sendSuccess(res, {
        statusCode: 200,
        message: "Login successful.",
        data: safeResult,
    });
};


export const registerController = async (req, res) => {
    const { username, email, password } = req.body;

    const result = await registerService({ username, email, password });

    return sendSuccess(res, {
        statusCode: 201,
        message: "User registered successfully.",
        data: result,
    });
};


export const refreshController = async (req, res) => {

    const customHeader = req.headers['x-requested-with'];
    if (customHeader !== 'XMLHttpRequest') {
        throw new AppError("Forbidden", 403);
    }

    const rawToken = req.cookies?.[COOKIE_NAME];

    if (!rawToken) {
        throw new AppError("No refresh token provided.", 401);
    }

    let result;

    try {
        result = await refreshTokenService({ rawToken });
    } catch (err) {
        res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
        throw err; // re throw for the global error handler
    }

    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    const { refreshToken, ...safeResult } = result;

    return sendSuccess(res, {
        statusCode: 200,
        message: "Token refreshed successfully.",
        data: safeResult,
    });
};


export const logoutController = async (req, res) => {

    const customHeader = req.headers['x-requested-with'];
    if (customHeader !== 'XMLHttpRequest') {
        throw new AppError("Forbidden", 403);
    }

    const rawToken = req.cookies?.[COOKIE_NAME];
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!rawToken) {
        return sendSuccess(res, {
            statusCode: 200,
            message: "Logged out successfully.",
            data: null,
        });
    }

    await logoutService({ rawToken, accessToken });

    // Always clear the cookie — even if the DB record was already gone.
    // This ensures the client is fully logged out no matter what.
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

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
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

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
        message: 'If an account with that email address exists, a password reset link has been sent.',
        data: null,
    });
};


export const resetPasswordController = async (req, res) => {
    const { token, newPassword } = req.body;

    await resetPasswordService({ token, newPassword });

    return sendSuccess(res, {
        statusCode: 200,
        message: 'Password reset successfully. Please log in with your new password.',
        data: null,
    });
};


