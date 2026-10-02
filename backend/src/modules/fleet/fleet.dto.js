import { toNumber, roundTo } from "../../utils/serialize.js";

export const toVehicleDTO = (vehicle) => ({
    id: vehicle.id,
    code: vehicle.code,
    type: vehicle.type,
    isRefrigerated: vehicle.isRefrigerated,
    tempMinC: toNumber(vehicle.tempMinC),
    tempMaxC: toNumber(vehicle.tempMaxC),
    maxWeightKg: toNumber(vehicle.maxWeightKg),
    maxVolumeM3: toNumber(vehicle.maxVolumeM3),
    fuelKmPerLitre: toNumber(vehicle.fuelKmPerLitre),
    weeklyFuelQuotaL: toNumber(vehicle.weeklyFuelQuotaL),
    homeDepotId: vehicle.homeDepotId,
    homeDepot: { id: vehicle.homeDepot.id, code: vehicle.homeDepot.code, name: vehicle.homeDepot.name },
    defaultDriver: vehicle.defaultDriver
        ? { id: vehicle.defaultDriver.id, fullName: vehicle.defaultDriver.fullName }
        : null,
    isActive: vehicle.isActive,
    statusNote: vehicle.statusNote ?? null,
});

export const toVehicleListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toVehicleDTO),
    pagination: { page, pageSize, total },
});

export const toFleetSummaryDTO = ({ date, total, active, refrigerated, withTrips, inTransit }) => ({
    date,
    totalVehicles: total,
    activeVehicles: active,
    refrigeratedVehicles: refrigerated,
    vehiclesWithTrips: withTrips,
    vehiclesInTransit: inTransit,
});

// weekly fuel: quota, used, remaining (litres) for the ISO week starting weekStart
export const toWeeklyFuelDTO = ({ weekStart, quotaL, usedL, remainingL }) => ({ weekStart, quotaL, usedL, remainingL });

// a trip's planned load against the vehicle's capacity
const toTripLoadDTO = (trip, vehicle) => {
    const weightKg = toNumber(trip.plannedWeightKg);
    const volumeM3 = toNumber(trip.plannedVolumeM3);
    const maxWeightKg = toNumber(vehicle.maxWeightKg);
    const maxVolumeM3 = toNumber(vehicle.maxVolumeM3);
    return {
        id: trip.id,
        code: trip.code,
        tripNumber: trip.tripNumber,
        status: trip.status,
        planned: { weightKg, volumeM3 },
        capacity: { weightKg: maxWeightKg, volumeM3: maxVolumeM3 },
        utilisation: {
            weight: maxWeightKg > 0 ? roundTo(weightKg / maxWeightKg, 3) : null,
            volume: maxVolumeM3 > 0 ? roundTo(volumeM3 / maxVolumeM3, 3) : null,
        },
    };
};

export const toVehicleDetailDTO = ({ vehicle, date, trips, fuel }) => ({
    ...toVehicleDTO(vehicle),
    date,
    trips: trips.map((trip) => toTripLoadDTO(trip, vehicle)),
    weeklyFuel: toWeeklyFuelDTO(fuel),
});
