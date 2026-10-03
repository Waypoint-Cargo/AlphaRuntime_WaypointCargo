import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./modules/auth/pages/LoginPage";
import RegisterPage from "./modules/auth/pages/RegisterPage";
import ForgotPasswordPage from "./modules/auth/pages/ForgotPasswordPage";
import { useAppDispatch } from "./store/hooks";
import { useRef } from "react";
import { restoreSession } from "./modules/auth";
import { GuestRoute } from "./shared/guards/GuestRoute";

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
        </Routes>
    );
}

export default App;
