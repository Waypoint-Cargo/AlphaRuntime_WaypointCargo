// Username constraints � mirrors the backend Zod validator exactly
export const USERNAME_CONSTRAINTS = {
    MIN: 3,
    MAX: 20,
    PATTERN: /^[a-z0-9_]+$/,
};

// USER ROLES
export const USER_ROLES = {
    USER: "USER",
    ADMIN: "ADMIN",
    DISPATCHER: "DISPATCHER",
    LOADER: "LOADER",
    DRIVER: "DRIVER",
    STORE_MANAGER: "STORE_MANAGER",
    ADMIN: "ADMIN",
};
