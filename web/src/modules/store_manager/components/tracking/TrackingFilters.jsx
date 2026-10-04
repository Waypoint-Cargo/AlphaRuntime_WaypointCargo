import { ChevronDown, Funnel, Search } from "lucide-react";

// A dropdown with our own arrow icon
function FilterSelect({ label, value, onChange, children }) {
    return (
        <div className="relative">
            <select
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-11 appearance-none rounded-xl border border-line bg-surface pl-4 pr-10 text-sm text-forest outline-none focus:border-gold"
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
        </div>
    );
}

export default function TrackingFilters({ filters, onChange, couriers }) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
                <input
                    type="search"
                    value={filters.search}
                    onChange={(e) => onChange("search", e.target.value)}
                    placeholder="Search address..."
                    className="h-11 w-full rounded-xl border border-line bg-screen pl-11 pr-4 text-sm text-forest outline-none placeholder:text-ink-secondary/70 focus:border-gold focus:ring-2 focus:ring-gold/30"
                />
            </div>

            <FilterSelect label="Status" value={filters.status} onChange={(v) => onChange("status", v)}>
                <option value="all">All Status</option>
                <option value="in_transit">In Transit</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
            </FilterSelect>

            <FilterSelect label="Courier" value={filters.courier} onChange={(v) => onChange("courier", v)}>
                <option value="all">All Couriers</option>
                {couriers.map((name) => (
                    <option key={name} value={name}>
                        {name}
                    </option>
                ))}
            </FilterSelect>

            <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-forest transition hover:border-gold"
            >
                <Funnel className="size-4" />
                Filters
            </button>

            <div className="ml-auto flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2 font-semibold text-forest">
                    <span className="size-2 rounded-full bg-success" />
                    Live
                </span>
                <span className="hidden text-ink-secondary sm:block">Updated 12 sec ago</span>
            </div>
        </div>
    );
}