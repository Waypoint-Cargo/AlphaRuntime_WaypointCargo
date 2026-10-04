import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./modules/auth/pages/LoginPage";
import RegisterPage from "./modules/auth/pages/RegisterPage";
import ForgotPasswordPage from "./modules/auth/pages/ForgotPasswordPage";
import StoreManagerLayout from "./modules/store_manager/components/StoreManagerLayout";
import StoreDashboardPage from "./modules/store_manager/pages/StoreDashboardPage";
import DeliveryTrackingPage from "./modules/store_manager/pages/DeliveryTrackingPage";

// Temporary page for menu items we haven't built yet
const Soon = ({ title }) => <h1 className="text-2xl font-bold text-forest">{title} (coming soon)</h1>;

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/store" element={<StoreManagerLayout />}>
                <Route index element={<StoreDashboardPage />} />
                <Route path="create-order" element={<Soon title="Create Order" />} />
                <Route path="orders" element={<Soon title="Orders" />} />
                <Route path="tracking" element={<DeliveryTrackingPage />} />
                <Route path="report-issue" element={<Soon title="Report Delivery Issue" />} />
                <Route path="employees" element={<Soon title="Manage Employees" />} />
                <Route path="settings" element={<Soon title="Settings" />} />
            </Route>
        </Routes>
    );
}

export default App;