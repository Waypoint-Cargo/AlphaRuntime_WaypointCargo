import { ROLE_AREA, ROLE_HOME, ROUTES } from "@/constants/app.constants";

/**
 * SEC-5: Open Redirect Prevention
 *
 * Sanitize a redirect path from router location state before using it.
 * Allows only same-origin paths (starts with '/', not '//' or '/\').
 * Falls back to the given path if it is invalid or external.
 */
export function sanitizeRedirectPath(path, fallback) {
    if (
        typeof path === "string" &&
        path.startsWith("/") &&
        !path.startsWith("//") &&
        !path.startsWith("/\\")
    ) {
        return path;
    }
    return fallback;
}

// The dashboard a role lands on after signing in. Roles without a web
// dashboard get the unauthorized page (which explains and offers sign out).
export function getRoleHome(role) {
    return ROLE_HOME[role] ?? ROUTES.UNAUTHORIZED;
}

// True when `path` sits inside the area this role is allowed to browse.
export function canRoleAccessPath(role, path) {
    const area = ROLE_AREA[role];
    if (!area || typeof path !== "string") return false;
    return path === area || path.startsWith(`${area}/`);
}

// Where to send a freshly authenticated user: the page they originally asked
// for if their role may open it, otherwise their own dashboard.
export function resolvePostLoginPath(user, from) {
    const home = getRoleHome(user?.role);
    const requested = sanitizeRedirectPath(from, null);
    // `from` may carry a query string or hash — only the pathname decides access
    const pathname = requested?.split(/[?#]/)[0];
    return requested && canRoleAccessPath(user?.role, pathname) ? requested : home;
}
