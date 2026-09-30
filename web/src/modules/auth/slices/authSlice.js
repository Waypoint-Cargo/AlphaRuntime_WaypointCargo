import {
   createAsyncThunk,
   createSlice,
} from "@reduxjs/toolkit";
import { tokenService } from "@/services/tokenService";
import { decodeJwtPayload } from "@/shared/utils/jwtUtils";
import { rawBaseQuery } from "@/services/baseQuery";

let _sessionRestoreInFlight = false;

// get new access token using refresh token and restore the session
// this is used to restore the session when the user refreshes the page or opens the app for the first time
export const restoreSession = createAsyncThunk(
   "auth/restoreSession",
   async (_, { dispatch, getState, rejectWithValue }) => {
      // prevent double calls
      if (_sessionRestoreInFlight) {
         return rejectWithValue("Session restore already in progress");
      }

      _sessionRestoreInFlight = true;

      try {
         const result = await rawBaseQuery(
            { url: "/auth/refresh", method: "POST" },
            { dispatch, getState },
            {}
         );

         if (result.error) {
            // refresh failed -> logout locally
            dispatch(logout());
            // Logout from backend to ensure HTTP-only cookies (like refresh token) are cleared
            await rawBaseQuery(
               { url: "/auth/logout", method: "POST" },
               { dispatch, getState },
               {}
            );
            return rejectWithValue("No valid session");
         }

         const payload = result.data;
         return payload.data.accessToken;
      } catch {
         return rejectWithValue("Network error during session restore");
      } finally {
         _sessionRestoreInFlight = false;
      }
   },
);

const initialState = {
   user: null,
   isInitialized: false,
};

const authSlice = createSlice({
   name: "auth",
   initialState,
   reducers: {
      // store the access token and update the user state
      setCredentials(state, action) {
         state.user = action.payload.user;
         tokenService.setToken(action.payload.accessToken);
      },

      logout(state) {
         state.user = null;
         tokenService.clearToken();
      },

      updateUser(state, action) {
         if (state.user) {
            state.user = { ...state.user, ...action.payload };
         }
      },
   },
   extraReducers: (builder) => {
      // Session restore succeeded — populate user from decoded JWT
      builder.addCase(restoreSession.fulfilled, (state, action) => {
         const accessToken = action.payload;
         tokenService.setToken(accessToken);
         const decoded = decodeJwtPayload(accessToken);
         if (decoded) {
            state.user = {
               id: decoded.sub,
               username: decoded.username,
               role: decoded.role,
               // Read authProvider from the token if present, default to 'local'
               authProvider: decoded.authProvider ?? "local",
            };
         }
         // Always mark initialized — even if decode somehow fails — so ProtectedRoute
         // never hangs on the spinner indefinitely.
         state.isInitialized = true;
      });

      // Session restore failed — mark initialized so the app doesn't hang on the splash screen
      builder.addCase(restoreSession.rejected, (state) => {
         state.user = null;
         state.isInitialized = true;
      });
   },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsInitialized = (state) =>
   state.auth.isInitialized;
export const selectIsAdmin = (state) =>
   state.auth.user?.role === "ADMIN";
export const selectIsAuthenticated = (state) => !!state.auth.user;

export default authSlice.reducer;
