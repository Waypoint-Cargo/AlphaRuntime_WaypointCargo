import { useState } from "react";
import { CircleCheck, Navigation, Truck, TriangleAlert } from "lucide-react";
import TrackingStatCard from "../components/tracking/TrackingStatCard";
import TrackingFilters from "../components/tracking/TrackingFilters";
import { DRIVERS } from "../trackingMock";

// Temporary sample numbers. We'll replace them with real data from the backend later.
const STATS = [
    { icon: Truck, value: 24, label: "Active Deliveries", tone: "success" },
    { icon: Navigation, value: 15, label: "In Transit", tone: "info" },
    { icon: TriangleAlert, value: 3, label: "Delayed", tone: "pending" },
    { icon: CircleCheck, value: 86, label: "Delivered Today", tone: "success" },
];

export default function DeliveryTrackingPage() {
    // The page remembers what the filters are set to
    const [filters, setFilters] = useState({ search: "", status: "all", courier: "all" });
    const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
    const couriers = DRIVERS.map((d) => d.name);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold text-forest">Live Tracking</h1>
                <p className="mt-1 text-sm text-ink-secondary">
                    Monitor active driver locations and delivery status in real time
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {STATS.map((stat) => (
                    <TrackingStatCard key={stat.label} {...stat} />
                ))}
            </div>

            <TrackingFilters filters={filters} onChange={updateFilter} couriers={couriers} />

            {/* NEXT STEPS: drivers list, map, bottom details */}
        </div>
    );
}