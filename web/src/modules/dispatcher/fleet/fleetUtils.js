// Shared constants and pure helpers for the Fleet screen. Enum values mirror the backend
// (prisma `VehicleType` / `VehicleStatus`, backend/src/modules/fleet).

export const PAGE_SIZE = 10;

export const VEHICLE_TYPES = {
    REFRIGERATED_TRUCK: "REFRIGERATED_TRUCK",
    DRY_BOX_TRUCK: "DRY_BOX_TRUCK",
    VAN: "VAN",
};

// The dispatcher board calls a dry-box truck an "Ambient Truck"
export const TYPE_LABELS = {
    [VEHICLE_TYPES.REFRIGERATED_TRUCK]: "Refrigerated Truck",
    [VEHICLE_TYPES.DRY_BOX_TRUCK]: "Ambient Truck",
    [VEHICLE_TYPES.VAN]: "Van",
};

export const VEHICLE_STATUS = {
    AVAILABLE: "AVAILABLE",
    ASSIGNED: "ASSIGNED",
    ON_ROUTE: "ON_ROUTE",
    MAINTENANCE: "MAINTENANCE",
};

export const STATUS_LABELS = {
    [VEHICLE_STATUS.AVAILABLE]: "Available",
    [VEHICLE_STATUS.ASSIGNED]: "Assigned",
    [VEHICLE_STATUS.ON_ROUTE]: "On Route",
    [VEHICLE_STATUS.MAINTENANCE]: "Maintenance",
};

// What a status change means, shown next to each option in the status dialog
export const STATUS_HINTS = {
    [VEHICLE_STATUS.AVAILABLE]: "Ready to be assigned to a delivery run.",
    [VEHICLE_STATUS.ASSIGNED]: "Allocated to a run that hasn't left the depot yet.",
    [VEHICLE_STATUS.ON_ROUTE]: "Out delivering right now.",
    [VEHICLE_STATUS.MAINTENANCE]: "Under service and unavailable for planning.",
};

// Mirrors VALID_STATUS_TRANSITIONS in backend fleet.service.js, so the UI only offers moves the
// API accepts. The server stays the authority (it answers 409 for anything else).
export const STATUS_TRANSITIONS = {
    [VEHICLE_STATUS.AVAILABLE]: [VEHICLE_STATUS.ASSIGNED, VEHICLE_STATUS.MAINTENANCE],
    [VEHICLE_STATUS.ASSIGNED]: [VEHICLE_STATUS.ON_ROUTE, VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.MAINTENANCE],
    [VEHICLE_STATUS.ON_ROUTE]: [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.MAINTENANCE],
    [VEHICLE_STATUS.MAINTENANCE]: [VEHICLE_STATUS.AVAILABLE],
};

// A vehicle committed to a delivery run can't be deactivated or deleted until it is Available again
export const isCommitted = (vehicle) =>
    vehicle.status === VEHICLE_STATUS.ASSIGNED || vehicle.status === VEHICLE_STATUS.ON_ROUTE;

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export const ALL = "ALL";

// Status filter values: "ALL", one VEHICLE_STATUS, or one of these two views
export const STATUS_FILTER = {
    IN_ROUTE: "IN_ROUTE", // Assigned + On Route together — what the "In Route" tile counts
    INACTIVE: "INACTIVE", // deactivated vehicles, whatever their last status was
};

export const STATUS_FILTER_OPTIONS = [
    { value: ALL, label: "All statuses" },
    { value: VEHICLE_STATUS.AVAILABLE, label: STATUS_LABELS.AVAILABLE },
    { value: VEHICLE_STATUS.ASSIGNED, label: STATUS_LABELS.ASSIGNED },
    { value: VEHICLE_STATUS.ON_ROUTE, label: STATUS_LABELS.ON_ROUTE },
    { value: STATUS_FILTER.IN_ROUTE, label: "In Route (Assigned + On Route)" },
    { value: VEHICLE_STATUS.MAINTENANCE, label: STATUS_LABELS.MAINTENANCE },
    { value: STATUS_FILTER.INACTIVE, label: "Deactivated" },
];

export const DEFAULT_FILTERS = { type: ALL, status: ALL, depotId: ALL, search: "" };

export const hasActiveFilters = (filters) =>
    filters.type !== ALL || filters.status !== ALL || filters.depotId !== ALL || filters.search !== "";

// UI filters -> GET /vehicles query. The board shows active vehicles unless "Deactivated" is chosen,
// which is also what the summary tiles count.
export function toQueryArgs({ type, status, depotId, search }, page) {
    const args = { page, limit: PAGE_SIZE };
    if (type !== ALL) args.type = type;
    if (depotId !== ALL) args.depotId = depotId;
    if (search) args.search = search;

    if (status === STATUS_FILTER.INACTIVE) {
        args.isActive = false;
    } else {
        args.isActive = true;
        if (status !== ALL) args.status = status;
    }
    return args;
}

// Would this vehicle still be listed under `status` after it changed?
export function matchesStatusFilter(vehicle, status) {
    if (status === STATUS_FILTER.INACTIVE) return !vehicle.isActive;
    if (!vehicle.isActive) return false;
    if (status === ALL) return true;
    if (status === STATUS_FILTER.IN_ROUTE) return isCommitted(vehicle);
    return vehicle.status === status;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const numberFormat = (digits) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits });
const formatters = { 0: numberFormat(0), 1: numberFormat(1), 2: numberFormat(2) };

export const formatNumber = (value, digits = 0) =>
    value === null || value === undefined ? "—" : formatters[digits].format(value);

// a non-breaking space keeps a value and its unit on the same line
const NBSP = String.fromCharCode(0xa0);
export const formatKg = (value) => `${formatNumber(value)}${NBSP}kg`;
export const formatM3 = (value) => `${formatNumber(value, 1)}${NBSP}m³`;
export const formatLitres = (value) => `${formatNumber(value, 1)}${NBSP}L`;
export const formatKmPerLitre = (value) => `${formatNumber(value, 1)}${NBSP}km/L`;

// Weekly fuel left -> bar colour, using full class names so Tailwind can see them
export function fuelTone(percent) {
    if (percent > 50) return { bar: "bg-green-500", text: "text-green-700" };
    if (percent > 30) return { bar: "bg-yellow-400", text: "text-yellow-700" };
    return { bar: "bg-red-500", text: "text-red-600" };
}

// Describes the temperatures a vehicle can hold. The seeded fleet has no range set, so every
// part of it may be missing.
export function describeTemperature(vehicle) {
    const { isRefrigerated, tempMinC, tempMaxC } = vehicle;
    if (!isRefrigerated) return { range: "Ambient", note: "no refrigeration unit" };

    const hasMin = tempMinC !== null && tempMinC !== undefined;
    const hasMax = tempMaxC !== null && tempMaxC !== undefined;
    if (!hasMin && !hasMax) return { range: "Refrigerated", note: "temperature range not set" };

    let range;
    if (hasMin && hasMax) range = `${tempMinC}°C to ${tempMaxC}°C`;
    else if (hasMin) range = `${tempMinC}°C and above`;
    else range = `up to ${tempMaxC}°C`;

    const classes = [];
    if (hasMin && tempMinC <= -15) classes.push("frozen");
    if ((!hasMax || tempMaxC >= 2) && (!hasMin || tempMinC <= 5)) classes.push("chilled");
    return { range, note: classes.join(" & ") };
}
