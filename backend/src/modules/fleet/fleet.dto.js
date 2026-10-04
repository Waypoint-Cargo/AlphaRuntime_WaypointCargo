/**
 *  DTO - Data Transfer Object
 *  These transformers strip sensitive data and produce the exact shape
 *  that the API layer should send back to the client.
 *
 * RULE:
 *   Nothing from the service layer should reach the controller as a raw
 *   Prisma object. Always pass through a DTO transformer first.
 */

// Prisma Decimal -> plain JS number (or null), so the wire format is a JSON number, not a Decimal string.
const toNum = (value) => (value === null || value === undefined ? null : Number(value));

export const toDepotDTO = (depot) =>
    depot && { id: depot.id, code: depot.code, name: depot.name };

export const toDepotListDTO = (depots) => depots.map(toDepotDTO);

export const toDriverDTO = (driver) =>
    driver && {
        id: driver.id,
        fullName: driver.fullName,
        employeeNumber: driver.employeeNumber,
        phone: driver.phone,
    };

// Shapes this week's fuel usage for a vehicle. consumedL defaults to 0 when no entries exist yet.
export const toFuelSummaryDTO = ({ weeklyFuelQuotaL, consumedL, weekStart }) => {
    const quota = toNum(weeklyFuelQuotaL);
    const consumed = Math.min(toNum(consumedL) ?? 0, quota);
    const remaining = Math.max(quota - consumed, 0);
    return {
        weekStart,
        quotaL: quota,
        consumedL: consumed,
        remainingL: Math.round(remaining * 100) / 100,
        remainingPercent: quota > 0 ? Math.round((remaining / quota) * 100) : 0,
    };
};

// Shapes a single vehicle record. `fuel` is omitted when the caller doesn't supply a fuel summary
// (e.g. internal lookups that don't need it) and included as the computed weekly summary otherwise.
export const toVehicleDTO = (vehicle, fuel) => ({
    id: vehicle.id,
    code: vehicle.code,
    type: vehicle.type,
    isRefrigerated: vehicle.isRefrigerated,
    tempMinC: toNum(vehicle.tempMinC),
    tempMaxC: toNum(vehicle.tempMaxC),
    maxWeightKg: toNum(vehicle.maxWeightKg),
    maxVolumeM3: toNum(vehicle.maxVolumeM3),
    fuelKmPerLitre: toNum(vehicle.fuelKmPerLitre),
    weeklyFuelQuotaL: toNum(vehicle.weeklyFuelQuotaL),
    status: vehicle.status,
    isActive: vehicle.isActive,
    statusNote: vehicle.statusNote,
    homeDepot: toDepotDTO(vehicle.homeDepot),
    defaultDriver: toDriverDTO(vehicle.defaultDriver) ?? null,
    fuel: fuel ?? null,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
});

// Shapes a page of vehicles plus pagination metadata. fuelByVehicleId maps vehicle id -> consumedL this week.
export const toVehicleListResponseDTO = ({ items, total, page, limit, fuelByVehicleId, weekStart }) => ({
    items: items.map((vehicle) =>
        toVehicleDTO(
            vehicle,
            toFuelSummaryDTO({
                weeklyFuelQuotaL: vehicle.weeklyFuelQuotaL,
                consumedL: fuelByVehicleId.get(vehicle.id) ?? 0,
                weekStart,
            }),
        ),
    ),
    meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    },
});

// Shapes a flat list of vehicles (no pagination) — used for available/in-route/maintenance/compatible pickers.
export const toVehicleArrayDTO = (items, fuelByVehicleId, weekStart) =>
    items.map((vehicle) =>
        toVehicleDTO(
            vehicle,
            toFuelSummaryDTO({
                weeklyFuelQuotaL: vehicle.weeklyFuelQuotaL,
                consumedL: fuelByVehicleId.get(vehicle.id) ?? 0,
                weekStart,
            }),
        ),
    );

// Shapes the fleet summary tiles + breakdowns shown at the top of the Fleet board.
export const toFleetStatsDTO = ({ total, active, byStatus, byType }) => {
    const statusCount = (status) => byStatus[status] ?? 0;
    return {
        totalVehicles: active,
        totalVehiclesIncludingInactive: total,
        available: statusCount("AVAILABLE"),
        inRoute: statusCount("ASSIGNED") + statusCount("ON_ROUTE"),
        maintenance: statusCount("MAINTENANCE"),
        byStatus: {
            AVAILABLE: statusCount("AVAILABLE"),
            ASSIGNED: statusCount("ASSIGNED"),
            ON_ROUTE: statusCount("ON_ROUTE"),
            MAINTENANCE: statusCount("MAINTENANCE"),
        },
        byType: {
            REFRIGERATED_TRUCK: byType.REFRIGERATED_TRUCK ?? 0,
            DRY_BOX_TRUCK: byType.DRY_BOX_TRUCK ?? 0,
            VAN: byType.VAN ?? 0,
        },
    };
};
