// Username constraints — mirrors the backend Zod validator exactly
export const USERNAME_CONSTRAINTS = {
   MIN: 3,
   MAX: 20,
   PATTERN: /^[a-z0-9_]+$/,
};
