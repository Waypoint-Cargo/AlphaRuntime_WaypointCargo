import { Routes, Route, Navigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import LoginPage from "./modules/auth/pages/LoginPage";
import RegisterPage from "./modules/auth/pages/RegisterPage";
import ForgotPasswordPage from "./modules/auth/pages/ForgotPasswordPage";
import { useAppDispatch } from "./store/hooks";
import { restoreSession } from "./modules/auth";
import { GuestRoute } from "./shared/guards/GuestRoute";
import "./App.css";
import MainLayout from "./shared/layouts/MainLayout";
import Dashboard from "./modules/dispatcher/pages/Dashboard";
import Orders from "./modules/dispatcher/pages/Orders";
import PlanAndAllocate from "./modules/dispatcher/pages/PlanAndAllocate";
import LiveTracking from "./modules/dispatcher/pages/LiveTracking";
import Fleet from "./modules/dispatcher/pages/Fleet";
import Deferrals from "./modules/dispatcher/pages/Deferrals";
import UserProfile from "./modules/profile/pages/UserProfile";

function App() {
    const dispatch = useAppDispatch();

    // prevent duplicate restore
    const sessionRestored = useRef(false);

    // ensures restoreSession fires exactly once per page load.
    useEffect(() => {
        if (sessionRestored.current) return;
        sessionRestored.current = true;
        dispatch(restoreSession());
    }, [dispatch]);

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            <Route
                path="/login"
                element={
                    <GuestRoute>
                        <LoginPage />
                    </GuestRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <GuestRoute>
                        <RegisterPage />
                    </GuestRoute>
                }
            />
            <Route
                path="/forgot-password"
                element={
                    <GuestRoute>
                        <ForgotPasswordPage />
                    </GuestRoute>
                }
            />

            <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/plan-and-allocate" element={<PlanAndAllocate />} />
                <Route path="/track-deliveries" element={<LiveTracking />} />
                <Route path="/fleet" element={<Fleet />} />
                <Route path="/deferrals" element={<Deferrals />} />
                <Route path="/profile" element={<UserProfile />} />
            </Route>
        </Routes>
    );
}

export default App;
