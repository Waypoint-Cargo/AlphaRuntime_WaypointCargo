import { createAction } from "@reduxjs/toolkit";

// Plain action creators with no other imports, so both the HTTP layer
// (services/baseQuery.js) and the slice can use them without a circular import.

// The session is over. reason: "logout" (user chose to) | "expired" (refresh failed)
export const sessionEnded = createAction("auth/sessionEnded", (reason = "logout") => ({
   payload: { reason },
}));

// A new access token was obtained through the refresh cookie
export const tokenRefreshed = createAction("auth/tokenRefreshed", (accessToken) => ({
   payload: { accessToken },
}));

export const logout = () => sessionEnded("logout");
export const sessionExpired = () => sessionEnded("expired");
