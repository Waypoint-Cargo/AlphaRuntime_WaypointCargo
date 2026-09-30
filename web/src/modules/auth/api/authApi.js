import { baseQueryWithReauth } from "@/services/baseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import { setCredentials, logout as logoutAction } from "../slices/authSlice";

export const authApi = createApi({
   reducerPath: "authApi",
   baseQuery: baseQueryWithReauth,
   endpoints: (build) => ({
      // login API
      login: build.mutation({
         query: (body) => ({ url: "/auth/login", method: "POST", body }),
         onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
            try {
               // Wait until the API request finishes successfully.
               const { data } = await queryFulfilled;
               dispatch(
                  setCredentials({
                     user: data.data.user,
                     accessToken: data.data.accessToken,
                  }),
               );
            } catch (error) {}
         },
      }),

      // google sign in API
      googleSignIn: build.mutation({
         query: (body) => ({ url: "/auth/google", method: "POST", body }),
         onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
            try {
               const { data } = await queryFulfilled;
               dispatch(
                  setCredentials({
                     user: data.data.user,
                     accessToken: data.data.accessToken,
                  }),
               );
            } catch {
               // handled by RTK Query
            }
         },
      }),

      // register API
      register: build.mutation({
         query: (body) => ({ url: "/auth/register", method: "POST", body }),
      }),

      // logout API
      logout: build.mutation({
         query: () => ({ url: "/auth/logout", method: "POST" }),
         onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
            // Clear auth state and ALL cached API data so the next user
            // never sees a previous user's notes/profile from the RTK Query cache.
            dispatch(logoutAction());
            try {
               await queryFulfilled;
            } catch (error) {}
         },
      }),

      // Logout all devices
      logoutAll: build.mutation({
         query: () => ({ url: "/auth/logout-all", method: "POST" }),
         onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
            // Clear auth state and ALL cached API data so the next user
            // never sees a previous user's notes/profile from the RTK Query cache.
            dispatch(logoutAction());
            dispatch(notesApi.util.resetApiState());
            dispatch(profileApi.util.resetApiState());
            try {
               await queryFulfilled;
            } catch {
               /* best-effort */
            }
         },
      }),

      // Forgot password
      forgotPassword: build.mutation({
         query: (body) => ({
            url: "/auth/forgot-password",
            method: "POST",
            body,
         }),
      }),

      // Reset password
      resetPassword: build.mutation({
         query: (body) => ({
            url: "/auth/reset-password",
            method: "POST",
            body,
         }),
      }),
   }),
});

export const {
   useLoginMutation,
   useGoogleSignInMutation,
   useRegisterMutation,
   useLogoutMutation,
   useLogoutAllMutation,
   useForgotPasswordMutation,
   useResetPasswordMutation,
} = authApi;
