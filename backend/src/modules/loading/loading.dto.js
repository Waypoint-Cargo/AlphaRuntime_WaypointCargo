import { toYmd } from "../../utils/businessTime.js";

const CHECK_STATUSES = ["PENDING", "VERIFIED", "SHORT", "DAMAGED", "WRONG_ITEM"];
const TRIP_STATUSES = ["PLANNED", "LOADING", "LOADED", "IN_TRANSIT", "COMPLETED", "CANCELLED"];
const SHORTFALL_STATUSES = ["SHORT", "DAMAGED", "WRONG_ITEM"];

const zeroFilled = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));

// A check that is not VERIFIED (and not PENDING) means the item did not go on the truck as planned.
const isShortfallStatus = (status) => SHORTFALL_STATUSES.includes(status);

// Loading progress from item checks grouped by status: [{ status, count, plannedUnits, loadedUnits }]
const progressFromGroups = (groups) => {
    const byStatus = zeroFilled(CHECK_STATUSES);
    let plannedUnits = 0;
    let loadedUnits = 0;
    for (const group of groups) {
        byStatus[group.status] += group.count;
        plannedUnits += group.plannedUnits;
        loadedUnits += group.loadedUnits;
    }

    const totalItems = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    const checkedItems = totalItems - byStatus.PENDING;
    return {
        totalItems,
        checkedItems,
        pendingItems: byStatus.PENDING,
        shortItems: SHORTFALL_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
        byStatus,
        plannedUnits,
        loadedUnits,
        percent: totalItems === 0 ? 100 : Math.round((checkedItems / totalItems) * 100),
    };
};

// groups as the database returns them
const fromGroupBy = (rows) =>
    rows.map((row) => ({
        status: row.status,
        count: row._count._all,
        plannedUnits: row._sum.plannedQty ?? 0,
        loadedUnits: row._sum.loadedQty ?? 0,
    }));

// groups from a list of checks
const fromChecks = (checks) => {
    const groups = new Map();
    for (const check of checks) {
        const group = groups.get(check.status) ?? { status: check.status, count: 0, plannedUnits: 0, loadedUnits: 0 };
        group.count += 1;
        group.plannedUnits += check.plannedQty;
        group.loadedUnits += check.loadedQty ?? 0;
        groups.set(check.status, group);
    }
    return [...groups.values()];
};

const toSessionDTO = (session) => ({
    startedAt: session?.startedAt ?? null,
    startedBy: session?.startedBy ?? null,
    completedAt: session?.completedAt ?? null,
    completedBy: session?.completedBy ?? null,
    departedShort: session?.departedShort ?? false,
});

const toTaskBaseDTO = (trip) => ({
    tripId: trip.id,
    code: trip.code,
    tripNumber: trip.tripNumber,
    status: trip.status,
    deliveryDate: toYmd(trip.deliveryDate),
    plannedDeparture: trip.plannedDeparture ?? null,
    depot: trip.plan.depot,
    vehicle: trip.vehicle,
    driver: trip.driver ?? null,
    stopCount: trip._count.stops,
    loading: toSessionDTO(trip.loadingSession),
});

export const toTaskListDTO = (trips, checkGroups, { page, pageSize, total }) => {
    const bySession = new Map();
    for (const row of checkGroups) {
        bySession.set(row.sessionId, [...(bySession.get(row.sessionId) ?? []), row]);
    }

    return {
        items: trips.map((trip) => ({
            ...toTaskBaseDTO(trip),
            progress: progressFromGroups(fromGroupBy(bySession.get(trip.loadingSession?.id) ?? [])),
        })),
        pagination: { page, pageSize, total },
    };
};

export const toLoadingSummaryDTO = ({ date, tripGroups, checkGroups }) => {
    const byStatus = zeroFilled(TRIP_STATUSES);
    for (const row of tripGroups) byStatus[row.status] = row._count._all;

    return {
        date,
        trips: { total: Object.values(byStatus).reduce((sum, count) => sum + count, 0), byStatus },
        items: progressFromGroups(fromGroupBy(checkGroups)),
    };
};

// One task in full: the stops in delivery order, each with its orders and the state of every item.
// loadSequence is the order of loading: the last stop is loaded first, so it comes off the truck last.
export const toTaskDetailDTO = (trip) => {
    const checks = trip.loadingSession?.checks ?? [];
    const checkOf = new Map(checks.map((check) => [check.orderItemId, check]));
    const stopCount = trip.stops.length;

    return {
        ...toTaskBaseDTO(trip),
        actualDeparture: trip.actualDeparture ?? null,
        progress: progressFromGroups(fromChecks(checks)),
        stops: trip.stops.map((stop) => ({
            stopId: stop.id,
            sequence: stop.sequence,
            loadSequence: stopCount - stop.sequence + 1,
            outlet: stop.outlet,
            orders: stop.allocations.map(({ order }) => ({
                orderId: order.id,
                reference: order.reference,
                brand: order.brand,
                tempClass: order.tempClass,
                items: order.items.map((item) => {
                    const check = checkOf.get(item.id);
                    return {
                        orderItemId: item.id,
                        lineNo: item.lineNo,
                        itemName: item.itemName,
                        unit: item.unit,
                        plannedQty: check?.plannedQty ?? item.quantity,
                        loadedQty: check?.loadedQty ?? null,
                        status: check?.status ?? "PENDING",
                        checkedAt: check?.checkedAt ?? null,
                    };
                }),
            })),
        })),
    };
};

// the answer to a single item check: the item as it is now and the trip's progress
export const toCheckResultDTO = (check, { tripId, progressRows }) => ({
    tripId,
    orderItemId: check.orderItemId,
    plannedQty: check.plannedQty,
    loadedQty: check.loadedQty,
    status: check.status,
    checkedAt: check.checkedAt,
    progress: progressFromGroups(fromGroupBy(progressRows)),
});

// the items of a trip that did not go on the truck as planned, for messages and the audit log
export const toShortItemsDTO = (checks) =>
    checks
        .filter((check) => isShortfallStatus(check.status))
        .map((check) => ({
            orderItemId: check.orderItemId,
            orderId: check.orderItem.orderId,
            itemName: check.orderItem.itemName,
            unit: check.orderItem.unit,
            plannedQty: check.plannedQty,
            loadedQty: check.loadedQty ?? 0,
            status: check.status,
        }));
