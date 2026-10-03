import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { tokenService } from "./tokenService";
import { sessionExpired, tokenRefreshed } from "@/modules/auth/slices/authActions";

// All HTTP traffic to the backend goes through this file.
//
//   rawBaseQuery          – one request: sends cookies, the Bearer token and the CSRF header
//   refreshAccessToken    – POST /auth/refresh (httpOnly cookie), shared by every caller
//   baseQueryWithReauth   – rawBaseQuery + "401 -> refresh -> retry once"
//
// Endpoints that must never trigger a refresh (login, register, refresh itself,
// logout, forgot/reset password) pass `extraOptions: { skipReauth: true }`.

export const rawBaseQuery = fetchBaseQuery({
   baseUrl: (import.meta.env.VITE_API_BASE_URL || "") + "/api",
   prepareHeaders: (headers) => {
      // attach the access token held in memory
      const token = tokenService.getToken();
      if (token) {
         headers.set("Authorization", `Bearer ${token}`);
      }

      // The backend rejects cookie-based refresh/logout calls without this header (CSRF defence)
      headers.set("X-Requested-With", "XMLHttpRequest");
      return headers;
   },
   // send/receive the httpOnly refresh-token cookie
   credentials: "include",
});

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

// The backend rotates the refresh token on every call and treats a second use of
// an old one as theft (it revokes the whole session). So two refreshes must never
// run with the same cookie: one at a time within this tab (the promise below) and
// one at a time across tabs (Web Locks), e.g. a browser reopening several tabs.
const REFRESH_LOCK = "waypoint-auth-refresh";
let refreshInFlight = null;

const withRefreshLock = (task) =>
   typeof navigator !== "undefined" && navigator.locks?.request
      ? navigator.locks.request(REFRESH_LOCK, task)
      : task();

async function requestNewAccessToken(api) {
   // Don't tie this shared request to one caller's AbortSignal
   const result = await rawBaseQuery(
      { url: "/auth/refresh", method: "POST" },
      { dispatch: api.dispatch, getState: api.getState },
      {},
   );

   const accessToken = result.data?.data?.accessToken;
   if (accessToken) {
      tokenService.setToken(accessToken);
      // lets the slice pick up a changed role from the new token
      api.dispatch(tokenRefreshed(accessToken));
      return { accessToken };
   }

   // 401/403 = the cookie is missing, expired, revoked or the account was disabled,
   // so the session is really over. Anything else (offline, 429, 5xx) is transient and
   // must not log the user out — the cookie is still good.
   const status = result.error?.status;
   return { error: result.error, sessionInvalid: status === 401 || status === 403 };
}

// Resolves to { accessToken } on success, or { error, sessionInvalid } on failure.
// Concurrent callers share a single request.
export function refreshAccessToken(api) {
   if (!refreshInFlight) {
      refreshInFlight = withRefreshLock(() => requestNewAccessToken(api)).finally(() => {
         refreshInFlight = null;
      });
   }
   return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Request with automatic re-authentication
// ---------------------------------------------------------------------------

// 1. send the request  2. on 401 refresh the access token  3. retry the request once
// If the refresh shows the session is over, end it locally (-> login page).
export const baseQueryWithReauth = async (args, api, extraOptions) => {
   const tokenUsed = tokenService.getToken();
   const result = await rawBaseQuery(args, api, extraOptions);

   if (result.error?.status !== 401 || extraOptions?.skipReauth) {
      return result;
   }

   // Another request may already have refreshed while this one was in flight —
   // then just retry with the newer token instead of rotating the cookie again.
   const currentToken = tokenService.getToken();
   if (currentToken && currentToken !== tokenUsed) {
      return rawBaseQuery(args, api, extraOptions);
   }

   const refreshed = await refreshAccessToken(api);

   if (refreshed.accessToken) {
      return rawBaseQuery(args, api, extraOptions);
   }

   if (refreshed.sessionInvalid) {
      tokenService.clearToken();
      api.dispatch(sessionExpired());
   }

   return result;
};
