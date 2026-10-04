import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import authReducer from "@/modules/auth/slices/authSlice";
import { sessionEnded } from "@/modules/auth/slices/authActions";
import { authApi } from "@/modules/auth/api/authApi";
import { ordersApi } from "@/modules/store_manager/Orders/ordersApi";
import { employeesApi } from "@/modules/store_manager/Employees/employeesApi";
import { profileApi } from "@/modules/profile/api/profileApi";

// When a session ends (logout, logout-all, refresh token rejected) wipe every RTK Query
// cache, so the next person to sign in never sees the previous user's data.
// Register each new createApi() here.
const sessionListener = createListenerMiddleware();
sessionListener.startListening({
    actionCreator: sessionEnded,
    effect: (_action, { dispatch }) => {
        dispatch(authApi.util.resetApiState());
        dispatch(ordersApi.util.resetApiState());
        dispatch(employeesApi.util.resetApiState());
        dispatch(profileApi.util.resetApiState());
    },
});

export const store = configureStore({
    reducer: {
        auth: authReducer,

        [authApi.reducerPath]: authApi.reducer,
        [ordersApi.reducerPath]: ordersApi.reducer,
        [employeesApi.reducerPath]: employeesApi.reducer,
        [profileApi.reducerPath]: profileApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .prepend(sessionListener.middleware)
            .concat(authApi.middleware, ordersApi.middleware, employeesApi.middleware, profileApi.middleware),
});
