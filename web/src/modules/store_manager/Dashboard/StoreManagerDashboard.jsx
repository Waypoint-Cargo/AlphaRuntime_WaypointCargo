import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, PlusCircle, CircleCheck, Package, PackageCheck, Plus, Truck, TriangleAlert } from "lucide-react";

import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/modules/auth/slices/authSlice";
import { ROLE_LABELS, ROUTES } from "@/constants/app.constants";
import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";
import StatCard from "../components/StatCard";
import TodaysDeliveries from "../components/TodaysDeliveries";
import CurrentDelivery from "../components/CurrentDelivery";
import RecentIssues from "../components/RecentIssues";
import { DELIVERIES as MOCK_DELIVERIES, CURRENT_DELIVERY as MOCK_CURRENT, ISSUES as MOCK_ISSUES } from "../mockData";
import { useGetOrdersQuery } from "../Orders/ordersApi";

const SHORTCUTS = [
    {
        to: ROUTES.STORE_MANAGER_ORDERS,
        title: "Review orders",
        text: "Check and confirm orders before dispatch planning.",
        icon: ClipboardList,
    },
    {
        to: ROUTES.STORE_MANAGER_CREATE_ORDER,
        title: "Create an order",
        text: "Enter delivery details and items for a new order.",
        icon: PlusCircle,
    },
];

// Placeholder landing page for store managers. The real dashboard widgets come later;
// this exists so the sign-in -> role redirect has somewhere to land.
// We'll fetch recent orders from the backend and derive stats/deliveries from them.
export default function StoreManagerDashboard() {
    const user = useAppSelector(selectUser);
    const { data: ordersResp } = useGetOrdersQuery({ pageSize: 100 });
    const orders = ordersResp?.items ?? [];

    const stats = React.useMemo(() => {
        const total = orders.length || MOCK_DELIVERIES.length;
        const confirmed = orders.filter((o) => o.status === "confirmed").length;
        const transit = orders.filter((o) => o.status === "transit").length;
        const delivered = orders.filter((o) => o.status === "delivered").length;
        const issues = MOCK_ISSUES.length; // replace when backend issues endpoint exists

        return [
            { icon: Package, value: total, label: "Orders Today", tone: "muted" },
            { icon: CircleCheck, value: confirmed, label: "Confirmed", tone: "info" },
            { icon: Truck, value: transit, label: "In Transit", tone: "pending" },
            { icon: PackageCheck, value: delivered, label: "Delivered", tone: "success" },
            { icon: TriangleAlert, value: issues, label: "Issues", tone: "error" },
        ];
    }, [orders]);

    const deliveries = React.useMemo(() => {
        if (orders.length) {
            return orders.slice(0, 6).map((o) => ({
                id: o.id || o.reference || o.uid,
                type: o.type || "dry",
                window: o.window || "—",
                // normalize backend status keys to the UI mapping (e.g. 'transit' -> 'in_transit')
                status: o.status === "transit" ? "in_transit" : o.status,
            }));
        }
        return MOCK_DELIVERIES;
    }, [orders]);

    const currentDelivery = React.useMemo(() => {
        const inTransit = orders.find((o) => o.status === "transit" || o.status === "in_transit");
        if (inTransit) {
            return {
                id: inTransit.id || inTransit.uid,
                typeLabel: inTransit.type || inTransit.vehicleType || "Delivery",
                eta: inTransit.window || "—",
                vehicle: inTransit.raw?.vehicle ?? "—",
                driver: inTransit.driver ?? "—",
                // normalize status for the UI mapping
                status: inTransit.status === "transit" ? "in_transit" : inTransit.status,
                progress: inTransit.raw?.progress ?? 0,
                departed: inTransit.raw?.departed ?? "—",
                arrives: inTransit.raw?.arrives ?? "—",
            };
        }
        return MOCK_CURRENT;
    }, [orders]);

    return (
        <div className="app">
            <TopBar />
            <Sidebar active="dashboard" />
            <main className="workspace">
                <div className="main-col">
                    <div className="mt-6 space-y-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-extrabold text-forest">Good morning, Manager</h2>
                                <p className="mt-1 text-sm text-ink-secondary">Here's the current status of your store deliveries.</p>
                            </div>
                            <Link
                                to={ROUTES.STORE_MANAGER_CREATE_ORDER}
                                className="flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-forest shadow-lg shadow-gold/30 transition hover:brightness-95"
                            >
                                <Plus className="size-5" />
                                Create New Order
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {stats.map((stat) => (
                                <StatCard key={stat.label} {...stat} />
                            ))}
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                            <TodaysDeliveries deliveries={deliveries} />
                            <CurrentDelivery delivery={currentDelivery} />
                        </div>

                        <RecentIssues issues={MOCK_ISSUES} />
                    </div>
                </div>
            </main>
        </div>
    );
}
