import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/modules/auth/slices/authSlice";
import { authApi } from "@/modules/auth/api/authApi";
import { ordersApi } from "@/modules/store_manager/Orders/ordersApi";

export const store = configureStore({
   reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
      [ordersApi.reducerPath]: ordersApi.reducer,
   },
   middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
         authApi.middleware,
         ordersApi.middleware,
      ),
});
