import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/modules/auth/slices/authSlice";
import { authApi } from "@/modules/auth/api/authApi";

export const store = configureStore({
   reducer: {
      auth: authReducer,

      [authApi.reducerPath]: authApi.reducer,
   },
   middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
});
