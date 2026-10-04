import { z } from "zod";
import { VEHICLE_TYPES } from "./fleetUtils";

// Form validation for the vehicle dialogs — mirrors backend/src/modules/fleet/fleet.validator.js so
// the dispatcher sees the same rules before the request is sent. Inputs hold text, so numbers
// are parsed here and the parsed values are what gets sent.

const number = (label) => z.coerce.number({ invalid_type_error: `${label} must be a number` });

const requiredNumber = (label, build) =>
    z.string().trim().min(1, `${label} is required`).pipe(build(number(label)));

// a blank input means "not provided"
const optionalNumber = (label, build) =>
    z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), build(number(label)).optional());

const positive = (label, max = 100_000) => (n) =>
    n.positive(`${label} must be greater than 0`).max(max, `${label} is unrealistically large`);

const temperature = (n) =>
    n.min(-40, "Temperature cannot be below -40°C").max(40, "Temperature cannot exceed 40°C");

export const vehicleFormSchema = z
    .object({
        code: z
            .string()
            .trim()
            .min(1, "Vehicle code is required")
            .max(20, "Vehicle code cannot exceed 20 characters")
            .toUpperCase(), // a built-in check, not a transform: an empty code must not hide the temperature-range error
        type: z.enum(Object.values(VEHICLE_TYPES), { errorMap: () => ({ message: "Select a vehicle type" }) }),
        isRefrigerated: z.boolean(),
        tempMinC: optionalNumber("Temperature", temperature),
        tempMaxC: optionalNumber("Temperature", temperature),
        maxWeightKg: requiredNumber("Weight capacity", positive("Weight capacity")),
        maxVolumeM3: requiredNumber("Volume capacity", positive("Volume capacity")),
        fuelKmPerLitre: optionalNumber("Fuel efficiency", positive("Fuel efficiency")),
        weeklyFuelQuotaL: requiredNumber("Weekly fuel quota", positive("Weekly fuel quota")),
        homeDepotId: z.string().min(1, "Select a home depot"),
        statusNote: z.string().trim().max(500, "Note cannot exceed 500 characters"),
    })
    .superRefine((data, ctx) => {
        if (data.isRefrigerated && data.tempMinC !== undefined && data.tempMaxC !== undefined && data.tempMinC > data.tempMaxC) {
            ctx.addIssue({ code: "custom", message: "Minimum cannot be greater than maximum", path: ["tempMaxC"] });
        }
    });

export const fuelEntrySchema = z.object({
    litres: requiredNumber("Litres", (n) => n.positive("Litres must be greater than 0").max(10_000, "Litres is unrealistically large")),
    distanceKm: optionalNumber("Distance", (n) =>
        n.nonnegative("Distance cannot be negative").max(5_000, "Distance is unrealistically large")),
    note: z.string().trim().max(500, "Note cannot exceed 500 characters"),
});

// The form edits text; a vehicle (or nothing, when adding) becomes its starting values.
export function toVehicleFormValues(vehicle) {
    const text = (value) => (value === null || value === undefined ? "" : String(value));
    return {
        code: vehicle?.code ?? "",
        type: vehicle?.type ?? "",
        isRefrigerated: vehicle?.isRefrigerated ?? false,
        tempMinC: text(vehicle?.tempMinC),
        tempMaxC: text(vehicle?.tempMaxC),
        maxWeightKg: text(vehicle?.maxWeightKg),
        maxVolumeM3: text(vehicle?.maxVolumeM3),
        fuelKmPerLitre: text(vehicle?.fuelKmPerLitre),
        weeklyFuelQuotaL: text(vehicle?.weeklyFuelQuotaL),
        homeDepotId: vehicle?.homeDepot?.id ?? "",
        statusNote: vehicle?.statusNote ?? "",
    };
}

// Parsed form values -> request body. On edit only the fields the dispatcher changed are sent.
// The API can't clear a temperature once set, so a blank one is simply left out.
export function toVehiclePayload(values, dirtyFields = null) {
    const payload = {};
    for (const [field, value] of Object.entries(values)) {
        if (dirtyFields && !dirtyFields[field]) continue;
        if (value === undefined || (field === "statusNote" && value === "" && !dirtyFields)) continue;
        if (!values.isRefrigerated && (field === "tempMinC" || field === "tempMaxC")) continue;
        payload[field] = value;
    }
    return payload;
}
