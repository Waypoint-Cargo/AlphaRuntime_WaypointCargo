import { ChevronDown, Clock, MapPin, Package, TriangleAlert } from "lucide-react";
import { DRIVER_STATUSES } from "../../constants";

function DriverRow({ driver, selected, onSelect }) {
    const s = DRIVER_STATUSES[driver.status];
    const isDelayed = driver.status === "delayed";

    return (
        <li className="border-b border-divider last:border-0">
            <button
                type="button"
                onClick={() => onSelect(driver.id)}
                className={`w-full px-5 py-4 text-left transition ${s.row} ${
                    selected ? "ring-2 ring-inset ring-gold" : "hover:bg-screen"
                }`}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold ${s.pill}`}
                    >
                        {driver.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-forest">{driver.id}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.pill}`}>
                                {s.label}
                            </span>
                        </div>
                        <p className="text-sm text-ink-secondary">{driver.name}</p>
                    </div>
                    <span className={`font-semibold ${s.eta}`}>{driver.eta}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="size-4" />
                        {driver.stopsLeft} stops left
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Package className="size-4" />
                        {driver.parcels} parcels
                    </span>
                    {driver.note && (
                        <span className={`flex items-center gap-1.5 ${isDelayed ? "text-pending" : ""}`}>
                            {isDelayed ? <TriangleAlert className="size-4" /> : <Clock className="size-4" />}
                            {driver.note}
                        </span>
                    )}
                </div>

                <div className="mt-3">
                    <div className="flex justify-between text-xs text-ink-secondary">
                        <span>Progress</span>
                        <span className="font-semibold text-forest">{driver.progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-divider">
                        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${driver.progress}%` }} />
                    </div>
                </div>
            </button>
        </li>
    );
}

export default function DriversList({ drivers, selectedId, onSelect }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-forest">Active Drivers</h2>
                    <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-forest">
                        {drivers.length}
                    </span>
                </div>
                <button type="button" className="flex items-center gap-1 text-sm text-ink-secondary">
                    ETA sort
                    <ChevronDown className="size-4" />
                </button>
            </div>

            {drivers.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-secondary">
                    No drivers match your filters.
                </p>
            ) : (
                <ul className="max-h-176 overflow-y-auto">
                    {drivers.map((d) => (
                        <DriverRow key={d.id} driver={d} selected={d.id === selectedId} onSelect={onSelect} />
                    ))}
                </ul>
            )}
        </section>
    );
}