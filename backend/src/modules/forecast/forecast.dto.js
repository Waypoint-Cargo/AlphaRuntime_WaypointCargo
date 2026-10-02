import { toYmd } from "../../utils/businessTime.js";
import { toNumber } from "../../utils/serialize.js";

export const toForecastRowDTO = (row) => ({
    forecastDate: toYmd(row.forecastDate),
    depotId: row.depotId,
    brand: row.brand,
    tempClass: row.tempClass,
    ordersExpected: toNumber(row.ordersExpected),
    weightKg: toNumber(row.weightKg),
    volumeM3: toNumber(row.volumeM3),
    lowerBound: toNumber(row.lowerBound),
    upperBound: toNumber(row.upperBound),
    modelVersion: row.modelVersion,
    generatedAt: row.generatedAt,
});

export const toDemandListDTO = (rows, { from, to, page, pageSize, total }) => ({
    from,
    to,
    items: rows.map(toForecastRowDTO),
    pagination: { page, pageSize, total },
});

export const toImportResultDTO = ({ modelVersion, generatedAt, received, created, updated }) => ({
    modelVersion,
    generatedAt,
    received,
    created,
    updated,
});

// ---- capacity plan ----

// one group (refrigerated or ambient) on one day
export const toCapacityGroupDTO = (group) => ({
    modelVersion: group.modelVersion,
    forecastWeightKg: group.forecastWeightKg,
    forecastVolumeM3: group.forecastVolumeM3,
    capacityWeightKg: group.capacityWeightKg,
    capacityVolumeM3: group.capacityVolumeM3,
    activeVehicles: group.activeVehicles,
    vehiclesNeeded: group.vehiclesNeeded,
    driversNeeded: group.driversNeeded,
    gap: group.gap,
});

export const toCapacityDepotDTO = ({ depot, fleet, days }) => ({
    depot: { id: depot.id, code: depot.code, name: depot.name },
    fleet,
    days: days.map((day) => ({
        date: day.date,
        isPayday: day.isPayday,
        festivalName: day.festivalName,
        refrigerated: toCapacityGroupDTO(day.refrigerated),
        ambient: toCapacityGroupDTO(day.ambient),
    })),
});

export const toCapacityDTO = ({ weekStart, formula, depots }) => ({ weekStart, formula, depots });
