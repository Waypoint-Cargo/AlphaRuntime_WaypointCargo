import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";

// Wraps the self-service `/api/users` endpoints (backend/src/modules/users). Both act on the
// signed-in user, so there is no id anywhere:
//
//   GET    /users/me   the caller's full profile
//   DELETE /users/me   the caller deletes their own account (not used by the UI yet)
export const profileApi = createApi({
    reducerPath: "profileApi",
    baseQuery: baseQueryWithReauth,
    endpoints: (builder) => ({
        getMyProfile: builder.query({
            query: () => ({ url: "/users/me" }),
            // the backend wraps the profile as { success, message, data }
            transformResponse: (response) => response?.data ?? null,
        }),
    }),
});

export const { useGetMyProfileQuery } = profileApi;
