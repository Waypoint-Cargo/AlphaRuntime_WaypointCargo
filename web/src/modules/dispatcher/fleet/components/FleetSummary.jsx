import { CheckCircle2, ChevronRight, LayoutGrid, Route, Wrench } from "lucide-react";
import { ALL, STATUS_FILTER, VEHICLE_STATUS } from "../fleetUtils";

// Each tile doubles as a status filter. Counts come from GET /vehicles/stats and cover active
// vehicles, the same set the board lists by default.
const TILES = [
  {
    filter: ALL, label: "Total Vehicles", hint: "Fleet size", Icon: LayoutGrid,
    value: (stats) => stats.totalVehicles,
    hover: "hover:border-gray-300", iconBox: "bg-gray-50 border-gray-100 text-gray-600",
  },
  {
    filter: VEHICLE_STATUS.AVAILABLE, label: "Available", hint: "Ready for assignment", Icon: CheckCircle2,
    value: (stats) => stats.available,
    hover: "hover:border-green-300", iconBox: "bg-green-50 border-green-100 text-green-600",
  },
  {
    filter: STATUS_FILTER.IN_ROUTE, label: "In Route", hint: "Delivering now", Icon: Route,
    value: (stats) => stats.inRoute,
    hover: "hover:border-blue-300", iconBox: "bg-blue-50 border-blue-100 text-blue-600",
  },
  {
    filter: VEHICLE_STATUS.MAINTENANCE, label: "Maintenance", hint: "Under service", Icon: Wrench,
    value: (stats) => stats.maintenance,
    hover: "hover:border-red-300", iconBox: "bg-red-50 border-red-100 text-red-500",
  },
];

// stats: GET /vehicles/stats data (undefined until loaded); status: the active status filter
export default function FleetSummary({ stats, status, onSelect }) {
  const deactivated = stats ? stats.totalVehiclesIncludingInactive - stats.totalVehicles : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TILES.map(({ filter, label, hint, Icon, value, hover, iconBox }) => {
        // "Total" is the no-filter state, so it only ever acts as a reset, never as the active filter
        const isActive = filter !== ALL && status === filter;
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onSelect(filter)}
            aria-pressed={isActive}
            className={`flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left shadow-sm transition-colors ${
              isActive ? "border-[#053D31] ring-1 ring-[#053D31]" : `border-gray-200 ${hover}`
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg border ${iconBox}`}>
                <Icon size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="mb-1 text-2xl font-bold leading-none text-gray-900">{stats ? value(stats) : "–"}</p>
                <p className="mb-0.5 text-sm font-bold leading-none text-gray-700">{label}</p>
                <p className="text-[10px] text-gray-500">
                  {filter === ALL && deactivated > 0 ? `${hint} · ${deactivated} deactivated` : hint}
                </p>
              </div>
            </div>
            <ChevronRight className="shrink-0 text-gray-400" size={20} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
