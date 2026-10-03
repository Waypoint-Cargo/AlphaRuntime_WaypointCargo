import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { tokenService } from "./tokenService";
import { logout } from "@/modules/auth/slices/authSlice";

// Use RTK queries to send HTTP requests to the backend

// ---------------------------------------------------------------------------
// Cache-reset registry
// ---------------------------------------------------------------------------
// We cannot import notesApi / profileApi here directly — they import
// baseQueryWithReauth themselves, which would create a circular module
// dependency and crash at runtime.
//
// Instead, external modules (authApi, profileApi) register a callback once
// their own module has fully initialised. We call those callbacks lazily at
// runtime, so there is never an import-time cycle.
// ---------------------------------------------------------------------------
const _cacheResetFns = [];

/** Call this from any API module to register a cache-wipe callback. */
export function registerCacheReset(fn) {
   _cacheResetFns.push(fn);
}

function resetAllCaches(dispatch) {
   _cacheResetFns.forEach((fn) => fn(dispatch));
}

// ---------------------------------------------------------------------------

// Raw base query  - attach access token, include cookies, include header to indicate the request is coming from our SPA
export const rawBaseQuery = fetchBaseQuery({
   baseUrl: (import.meta.env.VITE_API_BASE_URL || "") + "/api",
   prepareHeaders: (headers) => {
      //attach the token from in-memory
      const token = tokenService.getToken();
      if (token) {
         headers.set("Authorization", `Bearer ${token}`);
      }

      // CSRF defence - tell server this request came from our SPA(Single Page Application)
      headers.set("X-Requested-With", "XMLHttpRequest");
      return headers;
   },
   credentials: "include",
});

// To prevent multiple refresh requests at the same time (which would waste API calls),
let _refreshPromise = null;

// Send API requests, if occurs 401 error try to refresh the access token and retry the request, if it fails log out the user
export const baseQueryWithReauth = async (args, api, extraOptions) => {
   // Execute original request
   let result = await rawBaseQuery(args, api, extraOptions);

   const url = typeof args === "string" ? args : args.url;

   //  Handle 401 Unauthorized (try to get new access token)
   if (
      result.error?.status === 401 &&
      !url.includes("/login") &&
      !url.includes("/refresh")
   ) {
      // If a refresh is not already in progress, start one
      if (!_refreshPromise) {
         _refreshPromise = rawBaseQuery(
            { url: "/auth/refresh", method: "POST" },
            api,
            extraOptions,
         );
      }
      // Wait for the refresh promise (either the one we just started, or one already in flight)
      const refreshResult = await _refreshPromise;

      // Clear the promise so subsequent 401s can trigger a new refresh if needed
      // (This runs for every waiting call, but resetting to null is idempotent)
      _refreshPromise = null;

      if ("data" in refreshResult && refreshResult.data) {
         // store the access token
         const payload = refreshResult.data;
         tokenService.setToken(payload.data.accessToken);

         // retry the original request
         result = await rawBaseQuery(args, api, extraOptions);
      } else {
         // refresh failed -> logout locally and wipe ALL cached API data so the
         // next user never sees this user's stale notes or profile.
         const d = api.dispatch;
         resetAllCaches(d);
         d(logout());
         // Logout from backend to ensure HTTP-only cookies (like refresh token) are cleared
         await rawBaseQuery(
            { url: "/auth/logout", method: "POST" },
            api,
            extraOptions,
         );
      }
   }

   return result;
};
