import { baseQueryWithReauth } from "@/services/baseQuery";
import { tokenService } from "@/services/tokenService";
import { userFromAccessToken } from "@/shared/utils/jwtUtils";
import { createApi } from "@reduxjs/toolkit/query/react";
import { setCredentials, logout as logoutAction } from "../slices/authSlice";

// Public auth endpoints answer 401/403 for ordinary reasons (wrong password, no
// cookie...), so they must not trigger the refresh-and-retry in baseQueryWithReauth.
const NO_REAUTH = { skipReauth: true };

export const authApi = createApi({
   reducerPath: "authApi",
   baseQuery: baseQueryWithReauth,
   endpoints: (build) => ({
      // POST /auth/login  { identifier, password } -> { accessToken, user } + refresh cookie
      login: build.mutation({
         query: (body) => ({ url: "/auth/login", method: "POST", body }),
         extraOptions: NO_REAUTH,
         onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
            try {
               const { data } = await queryFulfilled;
               const { accessToken, user } = data.data;

               // token first, so requests fired by the redirect already carry it
               tokenService.setToken(accessToken);
               // the login DTO has no employeeNumber; the access token does
               dispatch(
                  setCredentials({
                     user: { ...userFromAccessToken(accessToken), ...user },
                  }),
               );
            } catch {
               // surfaced to the form through the mutation's error
            }
         },
      }),

      // POST /auth/register -> 201, the account still needs approval before it can sign in
      register: build.mutation({
         query: (body) => ({ url: "/auth/register", method: "POST", body }),
         extraOptions: NO_REAUTH,
      }),

      // POST /auth/logout — needs the refresh cookie + the (possibly expired) access token
      logout: build.mutation({
         query: () => ({ url: "/auth/logout", method: "POST" }),
         extraOptions: NO_REAUTH,
         onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
            try {
               // the request must finish first: it still needs the token held in memory
               await queryFulfilled;
            } catch {
               // best effort — the user is signed out locally even if the server is unreachable
            } finally {
               tokenService.clearToken();
               dispatch(logoutAction());
            }
         },
      }),

      // POST /auth/logout-all — revokes every session; needs a valid access token
      logoutAll: build.mutation({
         query: () => ({ url: "/auth/logout-all", method: "POST" }),
         onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
            try {
               await queryFulfilled;
            } catch {
               // not signed out everywhere -> keep the session, the caller shows the error
               return;
            }
            tokenService.clearToken();
            dispatch(logoutAction());
         },
      }),

      // POST /auth/forgot-password { email } — always 200 with a generic message
      forgotPassword: build.mutation({
         query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
         extraOptions: NO_REAUTH,
      }),

      // POST /auth/reset-password { token, newPassword }
      resetPassword: build.mutation({
         query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
         extraOptions: NO_REAUTH,
      }),
   }),
});

export const {
   useLoginMutation,
   useRegisterMutation,
   useLogoutMutation,
   useLogoutAllMutation,
   useForgotPasswordMutation,
   useResetPasswordMutation,
} = authApi;
