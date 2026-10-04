import { Link } from "react-router-dom";
import { ChevronRight, Clock } from "lucide-react";
import Badge from "./Badge";
import { DELIVERY_TYPES, STATUSES } from "../constants";

export default function TodaysDeliveries({ deliveries }) {
    return (
        <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-forest">Today's Deliveries</h2>
                    <p className="text-sm text-ink-secondary">{deliveries.length} deliveries scheduled</p>
                </div>
                <Link
                    to="/store/orders"
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
                        {deliveries.map((d) => {
                            const type = DELIVERY_TYPES[d.type] ?? { tone: "muted", icon: null, label: d.type || "Unknown" };
                            const status = STATUSES[d.status] ?? { tone: "muted", label: d.status || "Unknown" };
                            return (
                                <tr key={d.id} className="border-b border-divider last:border-0 hover:bg-screen">
                                    <td className="px-4 py-4 font-semibold text-forest">{d.id}</td>
                                    <td className="px-4 py-4">
                                        <Badge tone={type.tone} icon={type.icon}>
                                            {type.label}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-forest">
                                        <span className="inline-flex items-center gap-2">
                                            <Clock className="size-4 text-ink-secondary" />
                                            {d.window}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge tone={status.tone} dot>
                                            {status.label}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <ChevronRight className="inline size-5 text-forest" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}