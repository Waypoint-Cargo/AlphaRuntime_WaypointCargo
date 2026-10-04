import {
  Activity, Box, Clock, Fuel, Pencil, Power, RotateCcw, Snowflake, StickyNote, Trash2, Truck, User,
} from "lucide-react";
import { formatDate, formatTimeAgo } from "@/shared/utils/dateUtils";
import {
  TYPE_LABELS, describeTemperature, formatKg, formatKmPerLitre, formatLitres, formatM3, fuelTone, isCommitted,
} from "../fleetUtils";
import { typeChips } from "../vehicleStyles";
import { StatusBadge, TypeChip } from "./VehicleBadges";

function Detail({ icon: Icon, iconClass, label, children }) {
  return (
    <div className="flex gap-4">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
        {children}
      </div>
    </div>
  );
}

const baseButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const buttonStyles = {
  primary: `${baseButton} bg-[#053D31] text-white hover:bg-[#042e25]`,
  neutral: `${baseButton} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`,
  danger: `${baseButton} border border-red-200 bg-white text-red-600 hover:bg-red-50`,
};

function ActionButton({ tone, icon: Icon, children, className = "", ...props }) {
  return (
    <button type="button" className={`${buttonStyles[tone]} ${className}`} {...props}>
      <Icon size={14} aria-hidden="true" /> {children}
    </button>
  );
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" role="status" aria-label="Loading vehicle details">
      <div className="space-y-3 border-b border-gray-100 p-5">
        <div className="h-6 w-28 rounded bg-gray-100" />
        <div className="h-3 w-44 rounded bg-gray-100" />
        <div className="h-6 w-24 rounded-lg bg-gray-100" />
      </div>
      <div className="space-y-6 p-5">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex gap-4">
            <div className="size-8 shrink-0 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-20 rounded bg-gray-100" />
              <div className="h-3.5 w-full rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// vehicle: the selected vehicle (undefined when the list is empty) · loading: the list is still loading
// onAction: "status" | "fuel" | "edit" | "deactivate" | "reactivate" | "delete"
export default function VehicleDetailPanel({ vehicle, loading = false, onAction }) {
  if (loading) return <PanelSkeleton />;

  if (!vehicle) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-gray-50 text-gray-400">
          <Truck size={24} aria-hidden="true" />
        </span>
        <p className="text-sm font-bold text-gray-900">No vehicle selected</p>
        <p className="mt-1 text-xs text-gray-500">Choose a vehicle from the list to see its details and manage it.</p>
      </div>
    );
  }

  const fuel = vehicle.fuel;
  const tone = fuel ? fuelTone(fuel.remainingPercent) : null;
  const temperature = describeTemperature(vehicle);
  const driver = vehicle.defaultDriver;
  const committed = isCommitted(vehicle);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label={`Details for ${vehicle.code}`}>
      <div className="border-b border-gray-100 p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900">{vehicle.code}</h2>
          <StatusBadge vehicle={vehicle} size="sm" />
        </div>
        <p className="mb-4 text-xs text-gray-500">
          {TYPE_LABELS[vehicle.type] ?? vehicle.type} · {vehicle.homeDepot?.name ?? "No depot"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {typeChips(vehicle).map((chip) => <TypeChip key={chip.label} chip={chip} className="rounded-lg px-2.5 py-1 text-[10px] font-bold" />)}
        </div>
      </div>

      <div className="flex-1 space-y-6 p-5">
        <Detail icon={Box} iconClass="bg-blue-50 text-blue-600" label="Capacity">
          <p className="text-sm font-bold text-gray-900">
            {formatKg(vehicle.maxWeightKg)} · {formatM3(vehicle.maxVolumeM3)}{" "}
            <span className="font-medium text-gray-500">(max payload / cargo volume)</span>
          </p>
        </Detail>

        <Detail icon={Fuel} iconClass="bg-yellow-50 text-yellow-600" label="Fuel quota">
          {fuel ? (
            <>
              <p className="text-sm font-bold text-gray-900">
                {fuel.remainingPercent}% of {formatLitres(fuel.quotaL)} weekly quota remaining
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                <div className={`h-full ${tone.bar}`} style={{ width: `${fuel.remainingPercent}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {formatLitres(fuel.remainingL)} left · {formatLitres(fuel.consumedL)} used since {formatDate(fuel.weekStart)}
                {vehicle.fuelKmPerLitre ? ` · ${formatKmPerLitre(vehicle.fuelKmPerLitre)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-gray-900">{formatLitres(vehicle.weeklyFuelQuotaL)} weekly quota</p>
          )}
        </Detail>

        <Detail icon={User} iconClass="bg-purple-50 text-purple-600" label="Default driver">
          {driver ? (
            <>
              <p className="text-sm font-bold text-gray-900">{driver.fullName}</p>
              <p className="text-xs text-gray-500">{[driver.employeeNumber, driver.phone].filter(Boolean).join(" · ")}</p>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-500">No default driver assigned</p>
          )}
        </Detail>

        <Detail icon={Snowflake} iconClass="bg-blue-50 text-blue-400" label="Temperature capability">
          <p className="text-sm font-bold text-gray-900">
            {temperature.range}{" "}
            {temperature.note && <span className="font-medium text-gray-500">({temperature.note})</span>}
          </p>
        </Detail>

        {vehicle.statusNote && (
          <Detail icon={StickyNote} iconClass="bg-gray-100 text-gray-600" label="Status note">
            <p className="whitespace-pre-line wrap-break-word text-sm font-medium text-gray-900">{vehicle.statusNote}</p>
          </Detail>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-100 p-5">
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            tone="primary" icon={Activity} onClick={() => onAction("status")} disabled={!vehicle.isActive}
            title={vehicle.isActive ? undefined : "Reactivate the vehicle to change its status"}
          >
            Change status
          </ActionButton>
          <ActionButton tone="neutral" icon={Fuel} onClick={() => onAction("fuel")}>Log fuel</ActionButton>
        </div>

        <ActionButton tone="neutral" icon={Pencil} onClick={() => onAction("edit")} className="w-full">Edit details</ActionButton>

        <div className="grid grid-cols-2 gap-2">
          {vehicle.isActive ? (
            <ActionButton
              tone="danger" icon={Power} onClick={() => onAction("deactivate")} disabled={committed}
              title={committed ? "Return the vehicle to Available before deactivating it" : undefined}
            >
              Deactivate
            </ActionButton>
          ) : (
            <ActionButton tone="neutral" icon={RotateCcw} onClick={() => onAction("reactivate")}>Reactivate</ActionButton>
          )}
          <ActionButton
            tone="danger" icon={Trash2} onClick={() => onAction("delete")} disabled={committed}
            title={committed ? "Return the vehicle to Available before deleting it" : undefined}
          >
            Delete
          </ActionButton>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50 p-4">
        <Clock size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
        <p className="text-xs font-medium leading-relaxed text-gray-500">
          Updated {formatTimeAgo(vehicle.updatedAt)} · added {formatDate(vehicle.createdAt)}.
        </p>
      </div>
    </div>
  );
}
