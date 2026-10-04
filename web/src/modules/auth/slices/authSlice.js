import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { tokenService } from "@/services/tokenService";
import { refreshAccessToken } from "@/services/baseQuery";
import { userFromAccessToken } from "@/shared/utils/jwtUtils";
import { sessionEnded, tokenRefreshed } from "./authActions";

// Restores the session after a page load / reload.
// The access token only lives in memory, so it is gone after a reload. The httpOnly
// refresh cookie survives, so we ask the backend for a new access token with it.
// Dispatched once, before the first render (see main.jsx).
export const restoreSession = createAsyncThunk(
   "auth/restoreSession",
   async (_, thunkApi) => {
      const result = await refreshAccessToken(thunkApi);

      if (!result.accessToken) {
         // No cookie / expired / revoked / backend unreachable -> stay signed out.
         // (The backend already clears a bad cookie itself, nothing to do client-side.)
         return thunkApi.rejectWithValue("No valid session");
      }

      const user = userFromAccessToken(result.accessToken);
      if (!user) {
         tokenService.clearToken();
         return thunkApi.rejectWithValue("Unreadable access token");
      }

      return user;
   },
);

const initialState = {
   user: null,
   // false until the first restoreSession attempt settles; guards render a spinner meanwhile
   isInitialized: false,
   // true when the last session ended because the refresh token stopped working
   sessionExpired: false,
};

const authSlice = createSlice({
   name: "auth",
   initialState,
   reducers: {
      // store the signed-in user (the access token itself is kept in tokenService, not in Redux)
      setCredentials(state, action) {
         state.user = action.payload.user;
         state.isInitialized = true;
         state.sessionExpired = false;
      },

      updateUser(state, action) {
         if (state.user) {
            state.user = { ...state.user, ...action.payload };
         }
      },
   },
   extraReducers: (builder) => {
      builder.addCase(restoreSession.fulfilled, (state, action) => {
         state.user = action.payload;
         state.isInitialized = true;
      });

      // Mark initialized even on failure so the guards never hang on the spinner
      builder.addCase(restoreSession.rejected, (state) => {
         state.user = null;
         state.isInitialized = true;
      });

      // Keep the user's role/name in step with the newest access token
      // (the backend re-reads the user from the database on every refresh).
      builder.addCase(tokenRefreshed, (state, action) => {
         const fromToken = userFromAccessToken(action.payload.accessToken);
         if (state.user && fromToken) {
            state.user = { ...state.user, ...fromToken };
         }
      });

      // Logout, logout-all and "refresh token rejected" all end up here
      builder.addCase(sessionEnded, (state, action) => {
         state.user = null;
         state.isInitialized = true;
         state.sessionExpired = action.payload.reason === "expired";
      });
   },
});

export const { setCredentials, updateUser } = authSlice.actions;
export { logout, sessionExpired } from "./authActions";

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectUserRole = (state) => state.auth.user?.role ?? null;
export const selectIsInitialized = (state) => state.auth.isInitialized;
export const selectIsAuthenticated = (state) => !!state.auth.user;
export const selectSessionExpired = (state) => state.auth.sessionExpired;

export default authSlice.reducer;
