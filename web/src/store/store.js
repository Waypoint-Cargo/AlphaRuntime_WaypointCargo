import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/slices/authSlice";
import { authApi } from "@/features/auth/api/authApi";

export const store = configureStore({
   reducer: {
      auth: authReducer,

      [authApi.reducerPath]: authApi.reducer,

   },
   middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
         authApi.middleware,
      ),
});

