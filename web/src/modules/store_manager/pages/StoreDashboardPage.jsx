import { Link } from "react-router-dom";
import { CircleCheck, Package, PackageCheck, Plus, Truck, TriangleAlert } from "lucide-react";
import StatCard from "../components/StatCard";
import TodaysDeliveries from "../components/TodaysDeliveries";
import CurrentDelivery from "../components/CurrentDelivery";
import RecentIssues from "../components/RecentIssues";
import { DELIVERIES, CURRENT_DELIVERY, ISSUES } from "../mockData";

// Temporary sample numbers. We'll replace these with real data from the backend later.
const STATS = [
    { icon: Package, value: 6, label: "Orders Today", tone: "muted" },
    { icon: CircleCheck, value: 3, label: "Confirmed", tone: "info" },
    { icon: Truck, value: 1, label: "In Transit", tone: "pending" },
    { icon: PackageCheck, value: 1, label: "Delivered", tone: "success" },
    { icon: TriangleAlert, value: 1, label: "Issues", tone: "error" },
];

export default function StoreDashboardPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-forest">Good morning, Manager</h1>
                    <p className="mt-1 text-sm text-ink-secondary">
                        Here's the current status of your store deliveries.
                    </p>
                </div>
                <Link
                    to="/store/create-order"
                    className="flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-forest shadow-lg shadow-gold/30 transition hover:brightness-95"
                >
                    <Plus className="size-5" />
                    Create New Order
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {STATS.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <TodaysDeliveries deliveries={DELIVERIES} />
                <CurrentDelivery delivery={CURRENT_DELIVERY} />
            </div>

            <RecentIssues issues={ISSUES} />
        </div>
    );
}