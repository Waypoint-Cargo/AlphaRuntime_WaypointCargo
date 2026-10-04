import { Snowflake, Sun, Truck } from "lucide-react";
import { VEHICLE_TYPES } from "./fleetUtils";

// Colour and icon per vehicle type, written out in full so Tailwind can see every class.
export const TYPE_STYLES = {
    [VEHICLE_TYPES.REFRIGERATED_TRUCK]: { Icon: Snowflake, text: "text-blue-500", chip: "bg-blue-50 text-blue-600" },
    [VEHICLE_TYPES.DRY_BOX_TRUCK]: { Icon: Sun, text: "text-orange-400", chip: "bg-orange-50 text-orange-600" },
    [VEHICLE_TYPES.VAN]: { Icon: Truck, text: "text-green-500", chip: "bg-green-50 text-green-600" },
};

// Text inputs, selects and textareas in the Fleet dialogs
export const inputClass = (hasError) =>
    `w-full rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-500 ${
        hasError
            ? "border-red-300 focus:border-red-400 focus:ring-red-400"
            : "border-gray-200 focus:border-[#053D31] focus:ring-[#053D31]"
    }`;

const REFRIGERATED_CHIP ={ label: "Refrigerated", className: "bg-blue-50 text-blue-600" };

// Small tags under the type: how the vehicle can be used. Vans can reach the mall/parking-constrained
// outlets that trucks can't; a van can also carry a refrigeration unit.
export function typeChips(vehicle) {
    const chips = [];
    if (vehicle.type === VEHICLE_TYPES.VAN) chips.push({ label: "Van Only Compatible", className: TYPE_STYLES.VAN.chip });
    if (vehicle.isRefrigerated) chips.push(REFRIGERATED_CHIP);
    if (!chips.length) chips.push({ label: "Standard", className: TYPE_STYLES[vehicle.type]?.chip ?? "bg-gray-100 text-gray-600" });
    return chips;
}
