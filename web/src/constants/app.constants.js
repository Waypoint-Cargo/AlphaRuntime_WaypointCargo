// USER ROLES - mirrors the backend `Role` enum (prisma/schema.prisma)
export const USER_ROLES = {
    ADMIN: "ADMIN",
    DISPATCHER: "DISPATCHER",
    LOADER: "LOADER",
    DRIVER: "DRIVER",
    STORE_MANAGER: "STORE_MANAGER",
};

export const ROLE_LABELS = {
    [USER_ROLES.ADMIN]: "Administrator",
    [USER_ROLES.DISPATCHER]: "Dispatcher",
    [USER_ROLES.LOADER]: "Loader",
    [USER_ROLES.DRIVER]: "Driver",
    [USER_ROLES.STORE_MANAGER]: "Store Manager",
};

// Every route the app knows about. Role areas live under their own prefix so a
// single <ProtectedRoute allowedRoles> wrapper guards the whole area.
export const ROUTES = {
    ROOT: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
    UNAUTHORIZED: "/unauthorized",

    STORE_MANAGER: "/store-manager",
    STORE_MANAGER_DASHBOARD: "/store-manager/dashboard",
    STORE_MANAGER_ORDERS: "/store-manager/orders",
    STORE_MANAGER_CREATE_ORDER: "/store-manager/orders/new",
    STORE_MANAGER_EMPLOYEES: "/store-manager/employees",
    STORE_MANAGER_PROFILE: "/store-manager/profile",

    DISPATCHER: "/dispatcher",
    DISPATCHER_DASHBOARD: "/dispatcher/dashboard",
    DISPATCHER_ORDERS: "/dispatcher/orders",
    DISPATCHER_PLAN: "/dispatcher/plan-and-allocate",
    DISPATCHER_TRACKING: "/dispatcher/track-deliveries",
    DISPATCHER_FLEET: "/dispatcher/fleet",
    DISPATCHER_DEFERRALS: "/dispatcher/deferrals",
    DISPATCHER_PROFILE: "/dispatcher/profile",
};

// Where each role lands after signing in. Roles missing here (ADMIN, LOADER,
// DRIVER) have no web dashboard yet and are sent to the unauthorized page.
export const ROLE_HOME = {
    [USER_ROLES.STORE_MANAGER]: ROUTES.STORE_MANAGER_DASHBOARD,
    [USER_ROLES.DISPATCHER]: ROUTES.DISPATCHER_DASHBOARD,
};

// Each role's own profile page (same screen, rendered inside that role's shell). The top-right
// avatar in every shell links here, so a role without an entry has no profile to open.
export const ROLE_PROFILE = {
    [USER_ROLES.STORE_MANAGER]: ROUTES.STORE_MANAGER_PROFILE,
    [USER_ROLES.DISPATCHER]: ROUTES.DISPATCHER_PROFILE,
};

// The route prefix each role is allowed to browse. Used to decide whether a
// remembered "come back to" path is still valid for whoever just signed in.
export const ROLE_AREA = {
    [USER_ROLES.STORE_MANAGER]: ROUTES.STORE_MANAGER,
    [USER_ROLES.DISPATCHER]: ROUTES.DISPATCHER,
};
