import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./modules/auth/pages/LoginPage";
import RegisterPage from "./modules/auth/pages/RegisterPage";
import ForgotPasswordPage from "./modules/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "./modules/auth/pages/ResetPasswordPage";
import UnauthorizedPage from "./modules/auth/pages/UnauthorizedPage";
import { GuestRoute } from "./shared/guards/GuestRoute";
import { ProtectedRoute } from "./shared/guards/ProtectedRoute";
import { RootRedirect } from "./shared/guards/RootRedirect";
import { USER_ROLES } from "./constants/app.constants";
import "./App.css";
import MainLayout from "./shared/layouts/MainLayout";
import Dashboard from "./modules/dispatcher/pages/Dashboard";
import Orders from "./modules/dispatcher/pages/Orders";
import PlanAndAllocate from "./modules/dispatcher/pages/PlanAndAllocate";
import LiveTracking from "./modules/dispatcher/pages/LiveTracking";
import Fleet from "./modules/dispatcher/pages/Fleet";
import Deferrals from "./modules/dispatcher/pages/Deferrals";
import UserProfile from "./modules/profile/pages/UserProfile";
import StoreManagerDashboard from "./modules/store_manager/Dashboard/StoreManagerDashboard";
import OrderPage from "./modules/store_manager/Orders/OrderPage";
import CreateOrderPage from "./modules/store_manager/Orders/CreateOrderPage";
import EmployeesPage from "./modules/store_manager/Employees/EmployeesPage";
import StoreManagerProfile from "./modules/store_manager/Profile/StoreManagerProfile";
import StoreManagerLayout from "./modules/store_manager/components/StoreManagerLayout";
import DeliveryTrackingPage from "./modules/store_manager/pages/DeliveryTrackingPage";
import ReportDeliveryIssuePage from "./modules/store_manager/pages/ReportDeliveryIssuePage";

// The session itself is restored once, before the first render (see main.jsx);
// the guards below wait for it, so nothing here needs to.
function App() {
    return (
        <Routes>
            {/* "/" -> the signed-in user's role dashboard, otherwise /login */}
            <Route path="/" element={<RootRedirect />} />

            {/* Signed-out only. Signed-in users are bounced to their dashboard. */}
            <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Opened from the emailed link, so it must work whether or not a session exists */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Any signed-in user, whatever the role */}
            <Route element={<ProtectedRoute />}>
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
            </Route>

            {/* Store Manager area */}
            <Route
                path="/store-manager"
                element={<ProtectedRoute allowedRoles={[USER_ROLES.STORE_MANAGER]} />}
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StoreManagerDashboard />} />
                <Route path="orders" element={<OrderPage />} />
                <Route path="orders/new" element={<CreateOrderPage />} />
                <Route path="tracking" element={<StoreManagerLayout active="tracking"><DeliveryTrackingPage /></StoreManagerLayout>} />
                <Route path="report-issue" element={<StoreManagerLayout active="issue"><ReportDeliveryIssuePage /></StoreManagerLayout>} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="profile" element={<StoreManagerProfile />} />
            </Route>

            {/* Dispatcher area */}
            <Route
                path="/dispatcher"
                element={<ProtectedRoute allowedRoles={[USER_ROLES.DISPATCHER]} />}
            >
                <Route element={<MainLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="plan-and-allocate" element={<PlanAndAllocate />} />
                    <Route path="track-deliveries" element={<LiveTracking />} />
                    <Route path="fleet" element={<Fleet />} />
                    <Route path="deferrals" element={<Deferrals />} />
                    <Route path="profile" element={<UserProfile />} />
                </Route>
            </Route>

            {/* Unknown URL (including the old un-prefixed dispatcher paths) */}
            <Route path="*" element={<RootRedirect />} />
        </Routes>
    );
}

export default App;
