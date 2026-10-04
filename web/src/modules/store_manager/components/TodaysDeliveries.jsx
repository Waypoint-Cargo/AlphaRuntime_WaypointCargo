import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock, Package, Snowflake, Truck } from "lucide-react";
import { ROUTES } from "@/constants/app.constants";

const DELIVERY_TYPES = {
    dry: { label: "Dry Goods", tone: "muted", icon: Package },
    chilled: { label: "Chilled Goods", tone: "info", icon: Snowflake },
    frozen: { label: "Frozen Goods", tone: "info", icon: Snowflake },
    ambient: { label: "Ambient", tone: "muted", icon: Package },
    express: { label: "Express", tone: "pending", icon: Truck },
};

const STATUSES = {
    pending: { label: "Pending", tone: "muted" },
    confirmed: { label: "Confirmed", tone: "info" },
    planned: { label: "Planned", tone: "info" },
    transit: { label: "In Transit", tone: "pending" },
    in_transit: { label: "In Transit", tone: "pending" },
    delivered: { label: "Delivered", tone: "success" },
    delayed: { label: "Delayed", tone: "error" },
    cancelled: { label: "Cancelled", tone: "error" },
};

const TONE_CLASSES = {
    muted: "bg-muted text-ink-secondary border-transparent",
    info: "bg-info-light text-info border-info/20",
    pending: "bg-pending-light text-pending border-pending/30",
    success: "bg-success-light text-success border-success/30",
    error: "bg-error-light text-error border-error/30",
};

const DOT_CLASSES = {
    muted: "bg-ink-secondary",
    info: "bg-info",
    pending: "bg-pending",
    success: "bg-success",
    error: "bg-error",
};

function StatusBadge({ children, tone = "muted", icon: Icon = null, dot = false }) {
    const toneStyle = TONE_CLASSES[tone] || TONE_CLASSES.muted;
    const dotStyle = DOT_CLASSES[tone] || DOT_CLASSES.muted;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize transition ${toneStyle}`}
        >
            {dot && <span className={`size-1.5 rounded-full shrink-0 ${dotStyle}`} />}
            {Icon && <Icon className="size-3.5 shrink-0" />}
            <span>{children}</span>
        </span>
    );
}

export default function TodaysDeliveries({ deliveries = [] }) {
    return (
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-forest">Today's Deliveries</h2>
                    <p className="text-sm text-ink-secondary">{deliveries.length} deliveries scheduled</p>
                </div>
                <Link
                    to={ROUTES.STORE_MANAGER_ORDERS}
                    className="flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
                >
                    View all
                    <ChevronRight className="size-4" />
                </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-136 text-left text-sm">
                    <thead>
                        <tr className="text-ink-secondary">
                            <th className="rounded-l-xl bg-muted px-4 py-3 font-medium">Order</th>
                            <th className="bg-muted px-4 py-3 font-medium">Delivery Type</th>
                            <th className="bg-muted px-4 py-3 font-medium">Expected Arrival</th>
                            <th className="bg-muted px-4 py-3 font-medium">Status</th>
                            <th className="rounded-r-xl bg-muted px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {deliveries.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-8 text-center text-sm text-ink-secondary">
                                    No scheduled deliveries for today.
                                </td>
                            </tr>
                        ) : (
                            deliveries.map((d) => {
                                const type = DELIVERY_TYPES[d.type] ?? { tone: "muted", icon: null, label: d.type || "Unknown" };
                                const status = STATUSES[d.status] ?? { tone: "muted", label: d.status || "Unknown" };
                                return (
                                    <tr key={d.id} className="border-b border-divider last:border-0 hover:bg-screen">
                                        <td className="px-4 py-4 font-semibold text-forest">{d.id}</td>
                                        <td className="px-4 py-4">
                                            <StatusBadge tone={type.tone} icon={type.icon}>
                                                {type.label}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-4 py-4 text-forest">
                                            <span className="inline-flex items-center gap-2">
                                                <Clock className="size-4 text-ink-secondary" />
                                                {d.window}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge tone={status.tone} dot>
                                                {status.label}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <ChevronRight className="inline size-5 text-forest" />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}