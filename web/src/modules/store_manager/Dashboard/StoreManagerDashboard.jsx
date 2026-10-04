import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
    CircleCheck,
    Package,
    PackageCheck,
    Plus,
    Truck,
    TriangleAlert,
    Clock,
    User,
    Navigation,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";

import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/modules/auth/slices/authSlice";
import { ROUTES } from "@/constants/app.constants";
import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";
import TodaysDeliveries from "../components/TodaysDeliveries.jsx";
import { useGetOrdersQuery } from "../Orders/ordersApi.js";

// Mock Fallbacks
const MOCK_DELIVERIES = [
    { id: "#ORD-9281", type: "chilled", window: "09:00 - 10:30 AM", status: "in_transit" },
    { id: "#ORD-9282", type: "dry", window: "10:00 - 11:30 AM", status: "confirmed" },
    { id: "#ORD-9283", type: "frozen", window: "11:30 - 01:00 PM", status: "planned" },
    { id: "#ORD-9284", type: "chilled", window: "01:30 - 03:00 PM", status: "pending" },
    { id: "#ORD-9285", type: "dry", window: "03:30 - 05:00 PM", status: "pending" },
    { id: "#ORD-9280", type: "ambient", window: "07:30 - 08:45 AM", status: "delivered" },
];

const MOCK_CURRENT = {
    id: "#ORD-9281",
    typeLabel: "Chilled Goods",
    eta: "24 mins",
    vehicle: "Van - WP CAD-4921",
    driver: "Kasun Perera",
    status: "in_transit",
    progress: 68,
    departed: "09:12 AM",
    arrives: "09:55 AM",
};

const MOCK_ISSUES = [
    {
        id: "ISS-104",
        orderId: "#ORD-9274",
        type: "damaged_item",
        title: "Damaged dairy cartons upon unloading",
        description: "2 out of 10 milk cartons had crushed outer seals during transit.",
        time: "25 min ago",
        status: "Investigating",
        severity: "Medium",
    },
    {
        id: "ISS-103",
        orderId: "#ORD-9268",
        type: "late_delivery",
        title: "Traffic delay on High Level Rd",
        description: "Driver Kasun reported a 20-minute traffic blockage near Nugegoda.",
        time: "1 hour ago",
        status: "Resolved",
        severity: "Low",
    },
    {
        id: "ISS-102",
        orderId: "#ORD-9255",
        type: "missing_item",
        title: "Missing 1 crate of organic apples",
        description: "Invoice indicated 5 crates, only 4 received at dock.",
        time: "Yesterday",
        status: "Pending Credit",
        severity: "High",
    },
];

// Inline Subcomponents
function StatCard({ icon: Icon, value, label, tone = "muted" }) {
    const toneStyles = {
        muted: "bg-muted text-forest/70",
        info: "bg-info-light text-info",
        pending: "bg-pending-light text-pending",
        success: "bg-success-light text-success",
        error: "bg-error-light text-error",
    };
    const iconTone = toneStyles[tone] || toneStyles.muted;

    return (
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    {label}
                </span>
                {Icon && (
                    <div className={`flex size-10 items-center justify-center rounded-xl ${iconTone}`}>
                        <Icon className="size-5" />
                    </div>
                )}
            </div>
            <div className="mt-3">
                <span className="text-3xl font-black tracking-tight text-forest">{value ?? 0}</span>
            </div>
        </div>
    );
}

function CurrentDelivery({ delivery }) {
    if (!delivery) {
        return (
            <section className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 shadow-xs">
                <div>
                    <h2 className="text-lg font-bold text-forest">Current Delivery</h2>
                    <p className="text-sm text-ink-secondary">Real-time status of current dispatch</p>
                </div>
                <div className="my-8 flex flex-col items-center justify-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-ink-secondary">
                        <Truck className="size-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-forest">No deliveries currently in transit</p>
                    <p className="mt-1 text-xs text-ink-secondary">Dispatched orders will appear here.</p>
                </div>
                <Link
                    to={ROUTES.STORE_MANAGER_ORDERS}
                    className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface py-2.5 text-xs font-semibold text-forest shadow-xs transition hover:border-gold"
                >
                    View Order Schedule
                </Link>
            </section>
        );
    }

    const progress = Math.min(Math.max(delivery.progress ?? 50, 5), 100);

    return (
        <section className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="relative flex size-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pending opacity-75"></span>
                            <span className="relative inline-flex size-2.5 rounded-full bg-pending"></span>
                        </span>
                        <h2 className="text-lg font-bold text-forest">Current Delivery</h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-pending/30 bg-pending-light px-2.5 py-1 text-xs font-semibold capitalize text-pending">
                        <span className="size-1.5 rounded-full bg-pending" />
                        {delivery.status?.replace("_", " ") || "In Transit"}
                    </span>
                </div>

                <div className="mt-4 rounded-xl border border-line/60 bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Order ID</span>
                            <p className="text-base font-extrabold text-forest">{delivery.id}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Est. Arrival</span>
                            <p className="text-base font-extrabold text-brand">{delivery.eta || delivery.arrives || "—"}</p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-ink-secondary">
                            <span>Departed {delivery.departed || "—"}</span>
                            <span>ETA {delivery.arrives || delivery.eta || "—"}</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line/80">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-pending to-forest transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-divider">
                        <span className="flex items-center gap-2 text-ink-secondary">
                            <User className="size-4 text-forest/70" /> Driver
                        </span>
                        <span className="font-semibold text-forest">{delivery.driver || "Assigned Driver"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-divider">
                        <span className="flex items-center gap-2 text-ink-secondary">
                            <Truck className="size-4 text-forest/70" /> Vehicle
                        </span>
                        <span className="font-semibold text-forest">{delivery.vehicle || "Standard Truck"}</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
                <Link
                    to={ROUTES.STORE_MANAGER_TRACKING}
                    className="flex items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-forest/90"
                >
                    <Navigation className="size-4 text-gold" />
                    Track Live on Map
                </Link>
                <Link
                    to={ROUTES.STORE_MANAGER_REPORT_ISSUE}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2 text-xs font-semibold text-ink-secondary transition hover:border-error/40 hover:text-error"
                >
                    <AlertTriangle className="size-3.5" />
                    Report Delivery Issue
                </Link>
            </div>
        </section>
    );
}

function RecentIssues({ issues = [] }) {
    return (
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-forest">Recent Delivery Issues</h2>
                    <p className="text-sm text-ink-secondary">
                        Exceptions, damaged goods, or delays reported by your store
                    </p>
                </div>
                <Link
                    to={ROUTES.STORE_MANAGER_REPORT_ISSUE}
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-forest shadow-xs transition hover:border-gold hover:bg-muted/30"
                >
                    <Plus className="size-4 text-forest" />
                    Report New Issue
                </Link>
            </div>

            {issues.length === 0 ? (
                <div className="my-8 flex flex-col items-center justify-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-success-light text-success">
                        <CheckCircle2 className="size-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-forest">No open issues</p>
                    <p className="mt-1 text-xs text-ink-secondary">All recent deliveries completed without discrepancies.</p>
                </div>
            ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {issues.map((issue) => {
                        const isError = issue.severity === "High" || issue.status === "Pending Credit";
                        return (
                            <div
                                key={issue.id}
                                className="flex flex-col justify-between rounded-xl border border-line bg-screen/40 p-4 transition hover:border-line/80 hover:bg-surface hover:shadow-xs"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`flex size-7 items-center justify-center rounded-lg ${isError ? "bg-error-light text-error" : "bg-pending-light text-pending"}`}>
                                                <AlertTriangle className="size-4" />
                                            </div>
                                            <span className="font-mono text-xs font-bold text-forest">{issue.id}</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${isError ? "bg-error-light text-error border-error/30" : "bg-pending-light text-pending border-pending/30"}`}>
                                            <span className={`size-1.5 rounded-full ${isError ? "bg-error" : "bg-pending"}`} />
                                            {issue.status}
                                        </span>
                                    </div>

                                    <div className="mt-3">
                                        <h4 className="text-sm font-bold text-forest line-clamp-1">{issue.title}</h4>
                                        <p className="mt-1 text-xs text-ink-secondary line-clamp-2">{issue.description}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-divider pt-3 text-xs">
                                    <span className="font-semibold text-forest/80">Order {issue.orderId}</span>
                                    <span className="inline-flex items-center gap-1 text-ink-secondary">
                                        <Clock className="size-3.5" />
                                        {issue.time}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function StoreManagerDashboard() {
    const user = useAppSelector(selectUser);
    const { data: ordersResp } = useGetOrdersQuery({ pageSize: 100 });
    const orders = ordersResp?.items ?? [];

    const stats = useMemo(() => {
        const total = orders.length || MOCK_DELIVERIES.length;
        const confirmed = orders.filter((o) => o.status === "confirmed").length;
        const transit = orders.filter((o) => o.status === "transit" || o.status === "in_transit").length;
        const delivered = orders.filter((o) => o.status === "delivered").length;
        const issues = MOCK_ISSUES.length;

        return [
            { icon: Package, value: total, label: "Orders Today", tone: "muted" },
            { icon: CircleCheck, value: confirmed, label: "Confirmed", tone: "info" },
            { icon: Truck, value: transit, label: "In Transit", tone: "pending" },
            { icon: PackageCheck, value: delivered, label: "Delivered", tone: "success" },
            { icon: TriangleAlert, value: issues, label: "Issues", tone: "error" },
        ];
    }, [orders]);

    const deliveries = useMemo(() => {
        if (orders.length) {
            return orders.slice(0, 6).map((o) => ({
                id: o.id || o.reference || o.uid,
                type: o.type || "dry",
                window: o.window || "—",
                status: o.status === "transit" ? "in_transit" : o.status,
            }));
        }
        return MOCK_DELIVERIES;
    }, [orders]);

    const currentDelivery = useMemo(() => {
        const inTransit = orders.find((o) => o.status === "transit" || o.status === "in_transit");
        if (inTransit) {
            return {
                id: inTransit.id || inTransit.uid,
                typeLabel: inTransit.type || inTransit.vehicleType || "Delivery",
                eta: inTransit.window || "—",
                vehicle: inTransit.raw?.vehicle ?? "—",
                driver: inTransit.driver ?? "—",
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
                                <h2 className="text-3xl font-extrabold text-forest">Good morning, {user?.fullName || "Manager"}</h2>
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
