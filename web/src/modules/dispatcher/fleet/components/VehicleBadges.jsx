import { Truck } from "lucide-react";
import { STATUS_LABELS, TYPE_LABELS } from "../fleetUtils";
import { TYPE_STYLES } from "../vehicleStyles";

export function VehicleTypeLabel({ type, size = 12, className = "" }) {
  const style = TYPE_STYLES[type];
  const Icon = style?.Icon ?? Truck;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold ${style?.text ?? "text-gray-500"} ${className}`}>
      <Icon size={size} aria-hidden="true" />
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function TypeChip({ chip, className = "" }) {
  return <span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${chip.className} ${className}`}>{chip.label}</span>;
}

const STATUS_STYLES = {
  AVAILABLE: { badge: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500" },
  ON_ROUTE: { badge: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  ASSIGNED: { badge: "text-yellow-700 bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" },
  MAINTENANCE: { badge: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" },
};
const DEACTIVATED_STYLE = { badge: "text-gray-600 bg-gray-100 border-gray-200", dot: "bg-gray-400" };

// A deactivated vehicle is out of service whatever status it had, so that is what the badge says.
export function StatusBadge({ vehicle, size = "md" }) {
  const style = vehicle.isActive ? STATUS_STYLES[vehicle.status] ?? DEACTIVATED_STYLE : DEACTIVATED_STYLE;
  const label = vehicle.isActive ? STATUS_LABELS[vehicle.status] ?? vehicle.status : "Deactivated";
  const sizing = size === "sm" ? "gap-1 px-2 py-0.5 text-[10px]" : "gap-1.5 px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border font-bold ${sizing} ${style.badge}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
