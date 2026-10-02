import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { assertDepotAccess } from "../../utils/scope.js";
import { businessMinutesOfDay, fromYmd, minutesToHHMM, todayBusinessDate } from "../../utils/businessTime.js";
import { roundTo, toNumber } from "../../utils/serialize.js";
import * as usersService from "../users/users.service.js";
import * as ordersService from "../orders/orders.service.js";
import * as fleetService from "../fleet/fleet.service.js";
import * as tripsService from "../trips/trips.service.js";
import * as allocationsService from "../allocations/allocations.service.js";
import * as deferralsService from "../deferrals/deferrals.service.js";
import * as issuesService from "../issues/issues.service.js";
import * as loadingService from "../loading/loading.service.js";
import * as trackingService from "../tracking/tracking.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import {
    findDayStops,
    findOutletDayOrders,
    findPendingSequenceRequests,
    readCachedDashboard,
    sumRefrigeratedPlannedWeight,
    writeCachedDashboard,
} from "./dashboards.repository.js";
import {
    toCurrentDeliveryDTO,
    toDispatcherDashboardDTO,
    toLoaderDashboardDTO,
    toLoadingShortfallItem,
    toPendingDeferralItem,
    toRefrigeratedCapacityDTO,
    toSequenceRequestItem,
    toStopAtRiskItem,
    toStopFailedItem,
    toStoreIssueItem,
    toStoreManagerDashboardDTO,
    toTodaysDeliveryDTO,
} from "./dashboards.dto.js";

// how many entries of each kind the attention list takes from its source
const ATTENTION_PER_TYPE = 20;

// order statuses grouped the way the dashboards count them
const CONFIRMED_OR_LATER = ["CONFIRMED", "PLANNED", "PARTIALLY_LOADED", "LOADED", "IN_TRANSIT", "DELIVERED", "PARTIALLY_DELIVERED", "FAILED", "RECEIVED", "RECEIVED_WITH_ISSUES"];
const LOADED = ["LOADED", "PARTIALLY_LOADED"];
const DELIVERED = ["DELIVERED", "PARTIALLY_DELIVERED", "RECEIVED", "RECEIVED_WITH_ISSUES"];
const NOT_COUNTED = ["DRAFT", "CANCELLED"];

const countOf = (byStatus, statuses) => statuses.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);

// ---- the cache ----

// Every dashboard is cached for a few seconds per role, user and query; the repository does the caching.
const cached = async ({ role, userId, query, compute }) => {
    const text = Object.entries(query)
        .filter(([, value]) => value !== undefined && value !== null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");
    const key = `dashboard:${role}:${userId}:${text}`;

    const hit = await readCachedDashboard(key);
    if (hit) return hit;

    const dashboard = await compute();
    await writeCachedDashboard(key, dashboard);
    return dashboard;
};

// ---- dispatcher ----

const clockOf = (instant) => minutesToHHMM(businessMinutesOfDay(instant));

// why a pending stop is at risk, in words
const riskReason = (stop, { date, now }) => {
    const windowEnd = trackingService.stopWindowEnd(stop.outlet, date);
    if (now.getTime() > windowEnd.getTime()) return `its delivery window ended at ${clockOf(windowEnd)}`;
    return `it is predicted to arrive at ${clockOf(stop.predictedArrival)}, after its window ends at ${clockOf(windowEnd)}`;
};

const computeDispatcher = async ({ userId, depotIds, depotId, day, now }) => {
    const deliveryDate = fromYmd(day);

    const [
        orderCounts,
        availableVehicles,
        vehicleCounts,
        deferralSummary,
        shortfalls,
        storeIssues,
        pendingDeferrals,
        sequenceRequests,
        stops,
        refrigeratedWeight,
        depotVehicles,
    ] = await Promise.all([
        Promise.all(depotIds.map((id) => ordersService.countOrdersForDepotDate({ depotId: id, deliveryDate: day }))),
        fleetService.countAvailableVehicles({ depotIds, date: day, maxTrips: allocationsService.MAX_TRIPS_PER_DAY }),
        tripsService.countVehiclesWithTrips({ depotIds, date: day }),
        deferralsService.getDeferralSummaryService({ userId, date: day, depotId, now }),
        issuesService.listIssuesService({ userId, depotId, status: "OPEN", type: "LOADING_SHORTFALL", page: 1, pageSize: ATTENTION_PER_TYPE }),
        issuesService.listIssuesService({ userId, depotId, status: "OPEN", source: "STORE_MANAGER", page: 1, pageSize: ATTENTION_PER_TYPE }),
        deferralsService.listDeferralsService({ userId, date: day, depotId, status: "PENDING_DECISION", page: 1, pageSize: ATTENTION_PER_TYPE }),
        findPendingSequenceRequests({ depotIds, deliveryDate, take: ATTENTION_PER_TYPE }),
        findDayStops({ depotIds, deliveryDate }),
        sumRefrigeratedPlannedWeight({ depotIds, deliveryDate }),
        Promise.all(depotIds.map((id) => fleetService.listActiveDepotVehicles(id))),
    ]);

    // orders of all the depots, by status
    const byStatus = {};
    for (const counts of orderCounts) for (const [status, count] of Object.entries(counts)) byStatus[status] = (byStatus[status] ?? 0) + count;

    const atRisk = stops.filter((stop) => trackingService.isStopAtRisk(stop, { date: day, now }));
    const failed = stops.filter((stop) => stop.status === "FAILED" || stop.status === "SKIPPED");

    const refrigeratedCapacityKg = depotVehicles
        .flat()
        .filter((vehicle) => vehicle.isRefrigerated)
        .reduce((sum, vehicle) => sum + vehicle.maxWeightKg, 0) * allocationsService.MAX_TRIPS_PER_DAY;
    const plannedRefrigeratedKg = toNumber(refrigeratedWeight) ?? 0;

    const confirmedOrLater = countOf(byStatus, CONFIRMED_OR_LATER);

    return toDispatcherDashboardDTO({
        date: day,
        depotIds,
        kpis: {
            ordersConfirmed: confirmedOrLater,
            vehiclesAvailable: availableVehicles,
            activeDeliveries: vehicleCounts.inTransit,
            atRisk: atRisk.length,
            deferred: deferralSummary.deferredToday + deferralSummary.pendingDecisions,
        },
        pipeline: {
            orders: confirmedOrLater,
            planned: countOf(byStatus, ["PLANNED"]),
            loaded: countOf(byStatus, LOADED),
            inTransit: countOf(byStatus, ["IN_TRANSIT"]),
            delivered: countOf(byStatus, DELIVERED),
        },
        attentionItems: [
            ...failed.map(toStopFailedItem),
            ...atRisk.map((stop) => toStopAtRiskItem(stop, riskReason(stop, { date: day, now }))),
            ...shortfalls.items.map(toLoadingShortfallItem),
            ...pendingDeferrals.items.map(toPendingDeferralItem),
            ...storeIssues.items.map((issue) => toStoreIssueItem(issue, notificationsService.issueTypeLabel)),
            ...sequenceRequests.rows.map(toSequenceRequestItem),
        ],
        health: {
            onTrackStops: stops.length - failed.length - atRisk.length,
            atRiskStops: atRisk.length,
            failedStops: failed.length,
            openLoadingIssues: shortfalls.pagination.total,
            deferredOrders: deferralSummary.deferredToday,
            refrigeratedCapacity: toRefrigeratedCapacityDTO({
                plannedWeightKg: plannedRefrigeratedKg,
                capacityWeightKg: refrigeratedCapacityKg,
                usedRatio: refrigeratedCapacityKg > 0 ? roundTo(plannedRefrigeratedKg / refrigeratedCapacityKg, 4) : null,
            }),
        },
    });
};

export const getDispatcherDashboardService = async ({ userId, date, depotId, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    if (depotId) assertDepotAccess(scope, depotId);

    const depotIds = depotId ? [depotId] : scope.depotIds;
    const day = date ?? todayBusinessDate(now);

    return cached({
        role: scope.role,
        userId,
        query: { date: day, depotId },
        compute: () => computeDispatcher({ userId, depotIds, depotId, day, now }),
    });
};

// ---- store manager ----

const computeStoreManager = async ({ userId, outletId, day }) => {
    const [summary, open, investigating, recent, orders] = await Promise.all([
        ordersService.getOrdersSummaryService({ userId, deliveryDate: day }),
        issuesService.listIssuesService({ userId, status: "OPEN", page: 1, pageSize: 1 }),
        issuesService.listIssuesService({ userId, status: "INVESTIGATING", page: 1, pageSize: 1 }),
        issuesService.listIssuesService({ userId, page: 1, pageSize: 5 }),
        findOutletDayOrders({ outletId, deliveryDate: fromYmd(day) }),
    ]);

    // the order on the road that arrives first
    const onTheRoad = orders
        .filter((order) => order.status === "IN_TRANSIT" && order.allocation)
        .sort((a, b) => {
            const at = (order) => order.allocation.stop.predictedArrival?.getTime() ?? Number.MAX_SAFE_INTEGER;
            return at(a) - at(b);
        });

    const counts = summary.byStatus;
    return toStoreManagerDashboardDTO({
        date: day,
        kpis: {
            ordersForDate: summary.total - countOf(counts, NOT_COUNTED),
            confirmed: countOf(counts, CONFIRMED_OR_LATER),
            inTransit: countOf(counts, ["IN_TRANSIT"]),
            delivered: countOf(counts, DELIVERED),
            openIssues: open.pagination.total + investigating.pagination.total,
        },
        deliveries: orders.map(toTodaysDeliveryDTO),
        currentDelivery: onTheRoad[0] ? toCurrentDeliveryDTO(onTheRoad[0]) : null,
        recentIssues: recent.items,
    });
};

export const getStoreManagerDashboardService = async ({ userId, date, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    if (scope.role !== Role.STORE_MANAGER || !scope.outletId) {
        throw new AppError("Your account is not assigned to an outlet.", 403);
    }
    const day = date ?? todayBusinessDate(now);

    return cached({
        role: scope.role,
        userId,
        query: { date: day },
        compute: () => computeStoreManager({ userId, outletId: scope.outletId, day }),
    });
};

// ---- loader ----

// the loading module already summarises a loader's day; the dashboard only wraps that
export const getLoaderDashboardService = async ({ userId, date, now = new Date() }) => {
    const scope = await usersService.getScope(userId);
    const day = date ?? todayBusinessDate(now);

    return cached({
        role: scope.role,
        userId,
        query: { date: day },
        compute: async () => toLoaderDashboardDTO({ date: day, summary: await loadingService.getLoadingSummaryService({ userId, date: day }) }),
    });
};
