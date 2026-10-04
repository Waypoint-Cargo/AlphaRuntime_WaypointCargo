import { AlertCircle, Fuel, Plus, Truck } from "lucide-react";
import Pager from "@/shared/components/Pager";
import { formatKg, formatM3, formatNumber, fuelTone } from "../fleetUtils";
import { typeChips } from "../vehicleStyles";
import { StatusBadge, TypeChip, VehicleTypeLabel } from "./VehicleBadges";

const COLUMNS = [
  { label: "Vehicle" },
  { label: "Type" },
  { label: "Weight Capacity" },
  { label: "Volume Capacity" },
  { label: "Fuel Remaining" },
  { label: "Status", className: "pr-8 text-right" },
];

function FuelCell({ fuel }) {
  if (!fuel) return <span className="text-xs text-gray-400">—</span>;

  const tone = fuelTone(fuel.remainingPercent);
  return (
    <>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-bold text-gray-900">
          <Fuel size={12} className="text-gray-400" aria-hidden="true" /> {fuel.remainingPercent}%
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar" aria-label="Fuel remaining this week"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={fuel.remainingPercent}
      >
        <div className={`h-full ${tone.bar}`} style={{ width: `${fuel.remainingPercent}%` }} />
      </div>
    </>
  );
}

function SkeletonRows() {
  return Array.from({ length: 6 }, (_, row) => (
    <tr key={row} aria-hidden="true">
      {COLUMNS.map((column, cell) => (
        <td key={column.label} className="px-5 py-4">
          <div className="animate-pulse space-y-2">
            <div className={`h-3 rounded bg-gray-100 ${cell === 0 ? "w-20" : "w-24"}`} />
            {cell === 1 && <div className="h-2.5 w-16 rounded bg-gray-100" />}
          </div>
        </td>
      ))}
    </tr>
  ));
}

function Message({ icon: Icon, tone, title, children }) {
  return (
    <tr>
      <td colSpan={COLUMNS.length}>
        <div className="flex flex-col items-center px-6 py-14 text-center" role={tone === "error" ? "alert" : "status"}>
          <span className={`mb-3 grid size-12 place-items-center rounded-xl ${tone === "error" ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"}`}>
            <Icon size={24} aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <div className="mt-1 max-w-sm text-xs text-gray-500">{children}</div>
        </div>
      </td>
    </tr>
  );
}

const actionButton =
  "mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors";

// meta: { page, limit, total, totalPages } from the API
// state: { isLoading, isFetching, errorMessage, onRetry, isFiltered, onClearFilters, onAdd }
export default function FleetTable({ vehicles, meta, selectedId, onSelect, onPage, subtitle, state }) {
  const page = meta?.page ?? 1;
  const total = meta?.total ?? 0;
  const pageSize = meta?.limit ?? vehicles.length;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;

  return (
    <section className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <h3 className="font-bold text-gray-900">Fleet</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-200 border-collapse text-left" aria-busy={state.isLoading || state.isFetching}>
          <thead>
            <tr className="border-b border-gray-100">
              {COLUMNS.map((column) => (
                <th key={column.label} scope="col" className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${column.className ?? ""}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* dimmed while a filter, page or refresh is loading over the rows already shown */}
          <tbody className={`divide-y divide-gray-50 transition-opacity ${state.isFetching && !state.isLoading ? "opacity-60" : ""}`}>
            {state.isLoading && <SkeletonRows />}

            {!state.isLoading && state.errorMessage && (
              <Message icon={AlertCircle} tone="error" title="We couldn’t load the fleet">
                <p>{state.errorMessage}</p>
                <button type="button" onClick={state.onRetry} className={`${actionButton} bg-[#053D31] text-white hover:bg-[#042e25]`}>
                  Try again
                </button>
              </Message>
            )}

            {!state.isLoading && !state.errorMessage && vehicles.length === 0 && (
              state.isFiltered ? (
                <Message icon={Truck} title="No vehicles match your filters">
                  <p>Try a different search, or clear the filters to see the whole fleet.</p>
                  <button type="button" onClick={state.onClearFilters} className={`${actionButton} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
                    Clear filters
                  </button>
                </Message>
              ) : (
                <Message icon={Truck} title="No vehicles in the fleet yet">
                  <p>Register the first vehicle to start planning deliveries.</p>
                  <button type="button" onClick={state.onAdd} className={`${actionButton} bg-[#FFC107] text-[#053D31] hover:brightness-95`}>
                    <Plus size={14} aria-hidden="true" /> Add Vehicle
                  </button>
                </Message>
              )
            )}

            {!state.errorMessage && vehicles.map((vehicle) => {
              const isSelected = vehicle.id === selectedId;
              const chips = typeChips(vehicle);
              return (
                <tr
                  key={vehicle.id}
                  onClick={() => onSelect(vehicle.id)}
                  className={`cursor-pointer transition-colors ${isSelected ? "bg-yellow-50/50" : "hover:bg-gray-50"} ${vehicle.isActive ? "" : "opacity-70"}`}
                >
                  <td className="px-5 py-4">
                    <button
                      type="button" aria-pressed={isSelected} aria-label={`View ${vehicle.code}`}
                      className="flex items-center gap-2 text-sm font-bold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#053D31]"
                    >
                      <Truck size={16} className="text-gray-700" aria-hidden="true" /> {vehicle.code}
                    </button>
                    <p className="mt-0.5 pl-6 text-[10px] text-gray-500">{vehicle.homeDepot?.name ?? "No depot"}</p>
                  </td>

                  <td className="px-5 py-4">
                    <VehicleTypeLabel type={vehicle.type} className="mb-1" />
                    <div className="flex flex-wrap gap-1">
                      {chips.map((chip) => <TypeChip key={chip.label} chip={chip} />)}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm font-bold text-gray-900">{formatKg(vehicle.maxWeightKg)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-900">{formatM3(vehicle.maxVolumeM3)}</td>
                  <td className="px-5 py-4"><FuelCell fuel={vehicle.fuel} /></td>

                  <td className="px-5 py-4 pr-6 text-right"><StatusBadge vehicle={vehicle} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!state.isLoading && !state.errorMessage && total > 0 && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>
            Showing {formatNumber(first)}–{formatNumber(first + vehicles.length - 1)} of {formatNumber(total)} vehicles
          </span>
          {(meta?.totalPages ?? 1) > 1 && <Pager page={page} pageCount={meta.totalPages} onPage={onPage} />}
        </footer>
      )}
    </section>
  );
}
