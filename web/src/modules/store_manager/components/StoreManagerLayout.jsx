import { Outlet } from "react-router-dom";
import { CirclePlus, ClipboardList, LayoutDashboard, MapPin, TriangleAlert, Users } from "lucide-react";
import AppShell from "@/shared/components/AppShell";

const NAV = [
    { to: "/store", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/store/create-order", icon: CirclePlus, label: "Create Order" },
    { to: "/store/orders", icon: ClipboardList, label: "Orders" },
    { to: "/store/tracking", icon: MapPin, label: "Delivery Tracking" },
];

const SUPPORT = [
    { to: "/store/report-issue", icon: TriangleAlert, label: "Report Delivery Issue" },
    { to: "/store/employees", icon: Users, label: "Manage Employees" },
];

export default function StoreManagerLayout() {
    return (
        <AppShell nav={NAV} support={SUPPORT} settingsPath="/store/settings" user={{ initials: "AR" }}>
            <Outlet />
        </AppShell>
    );
}