import { ChevronDown, LayoutGrid, RefreshCw, Search, X } from "lucide-react";
import { ALL, STATUS_FILTER_OPTIONS, VEHICLE_TYPES } from "../fleetUtils";
import { TYPE_STYLES } from "../vehicleStyles";

const TYPE_PILLS = [
  { value: VEHICLE_TYPES.REFRIGERATED_TRUCK, label: "Refrigerated Truck", active: "bg-blue-50 text-blue-800 border-blue-200", on: "text-blue-600", off: "text-blue-500" },
  { value: VEHICLE_TYPES.DRY_BOX_TRUCK, label: "Ambient Truck", active: "bg-orange-50 text-orange-800 border-orange-200", on: "text-orange-500", off: "text-orange-400" },
  { value: VEHICLE_TYPES.VAN, label: "Van", active: "bg-green-50 text-green-800 border-green-200", on: "text-green-600", off: "text-green-500" },
];

const control =
  "h-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:border-[#053D31] focus:outline-none focus:ring-1 focus:ring-[#053D31]";

function Select({ label, value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${control} w-full appearance-none pl-3 pr-9`}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
    </div>
  );
}

// filters: { type, status, depotId } applied now · search: the text in the box (applied after a short pause)
export default function FleetFilters({ filters, search, depots, onFilter, onSearch, onRefresh, isRefreshing }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter by vehicle type">
        <button
          type="button"
          onClick={() => onFilter({ type: ALL })}
          aria-pressed={filters.type === ALL}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
            filters.type === ALL ? "bg-[#053D31] text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <LayoutGrid size={16} aria-hidden="true" /> All
        </button>

        {TYPE_PILLS.map(({ value, label, active, on, off }) => {
          const isOn = filters.type === value;
          const { Icon } = TYPE_STYLES[value];
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilter({ type: value })}
              aria-pressed={isOn}
              className={`flex items-center gap-2 rounded-lg border px-5 py-2 text-sm font-bold transition-colors ${
                isOn ? active : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} className={isOn ? on : off} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
        <div className="relative w-full sm:w-52">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="text" value={search} onChange={(e) => onSearch(e.target.value)} maxLength={50}
            placeholder="Search vehicle code…" aria-label="Search by vehicle code"
            className={`${control} w-full pl-9 ${search ? "pr-9" : "pr-3"}`}
          />
          {search && (
            <button
              type="button" onClick={() => onSearch("")} aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <Select label="Filter by depot" value={filters.depotId} onChange={(depotId) => onFilter({ depotId })} className="w-[calc(50%-0.25rem)] sm:w-44">
          <option value={ALL}>All depots</option>
          {depots.map((depot) => <option key={depot.id} value={depot.id}>{depot.name}</option>)}
        </Select>

        <Select label="Filter by status" value={filters.status} onChange={(status) => onFilter({ status })} className="w-[calc(50%-0.25rem)] sm:w-48">
          {STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>

        <button
          type="button" onClick={onRefresh} disabled={isRefreshing}
          className={`${control} flex items-center gap-2 px-3 font-medium shadow-sm hover:bg-gray-50 disabled:opacity-60`}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : undefined} aria-hidden="true" />
          Refresh
        </button>
      </div>
    </div>
  );
}
