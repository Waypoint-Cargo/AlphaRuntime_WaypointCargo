import { toNumber, toWindowDTO } from "../../utils/serialize.js";

// the most attention items a dashboard lists (the counts still cover all of them)
const MAX_ATTENTION_ITEMS = 50;

const SEVERITY_ORDER = { ERROR: 0, WARNING: 1, INFO: 2 };

// ---- attention items: what the dispatcher has to look at, and what the client should offer to do ----
// { type, severity, message, entityType, entityId, action, tripId? }

export const toLoadingShortfallItem = (issue) => ({
    type: "LOADING_SHORTFALL",
    severity: "WARNING",
    message: `Route ${issue.trip?.code ?? "?"} left the depot short (${issue.reference}).`,
    entityType: "Issue",
    entityId: issue.id,
    action: "REVIEW_ISSUE",
});

export const toStopAtRiskItem = (stop, reason) => ({
    type: "STOP_AT_RISK",
    severity: "WARNING",
    message: `${stop.outlet.name} (stop ${stop.sequence} of ${stop.trip.code}) is at risk: ${reason}.`,
    entityType: "Stop",
    entityId: stop.id,
    tripId: stop.trip.id,
    action: "VIEW_TRIP",
});

export const toStopFailedItem = (stop) => ({
    type: "STOP_FAILED",
    severity: "ERROR",
    message:
        `Delivery to ${stop.outlet.name} (stop ${stop.sequence} of ${stop.trip.code}) ` +
        `${stop.status === "SKIPPED" ? "was skipped" : "failed"}${stop.failureReason ? `: ${stop.failureReason}` : ""}.`,
    entityType: "Stop",
    entityId: stop.id,
    tripId: stop.trip.id,
    action: "VIEW_TRIP",
});

export const toPendingDeferralItem = (deferral) => ({
    type: "DEFERRAL_PENDING",
    severity: "WARNING",
    message: `Order ${deferral.order.reference} for ${deferral.outlet.name} needs a deferral decision.`,
    entityType: "Deferral",
    entityId: deferral.id,
    action: "DECIDE_DEFERRAL",
});

export const toSequenceRequestItem = (request) => ({
    type: "SEQUENCE_REQUEST",
    severity: "INFO",
    message: `${request.requestedBy.fullName} asked to change the stop order on ${request.trip.code}.`,
    entityType: "SequenceChangeRequest",
    entityId: request.id,
    tripId: request.trip.id,
    action: "REVIEW_SEQUENCE_REQUEST",
});

// issueTypeLabel comes from the notifications module
export const toStoreIssueItem = (issue, issueTypeLabel) => ({
    type: "STORE_ISSUE",
    severity: "WARNING",
    message: `${issueTypeLabel(issue.type)} reported${issue.order ? ` for order ${issue.order.reference}` : ""} (${issue.reference}).`,
    entityType: "Issue",
    entityId: issue.id,
    action: "REVIEW_ISSUE",
});

// most severe first; the order inside a severity is the order the items were given in
const toAttentionDTO = (items) => {
    const sorted = [...items].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    const byType = {};
    for (const item of items) byType[item.type] = (byType[item.type] ?? 0) + 1;
    return { total: items.length, byType, items: sorted.slice(0, MAX_ATTENTION_ITEMS) };
};

// ---- dispatcher ----

export const toDispatcherDashboardDTO = ({ date, depotIds, kpis, pipeline, attentionItems, health }) => ({
    date,
    depotIds,
    kpis,
    pipeline,
    attention: toAttentionDTO(attentionItems),
    health,
});

// ---- store manager ----

const toDeliveryWindow = (order) =>
    order.windowStartMin !== null && order.windowStartMin !== undefined && order.windowEndMin !== null && order.windowEndMin !== undefined
        ? toWindowDTO(order.windowStartMin, order.windowEndMin)
        : toWindowDTO(order.outlet.windowStartMin, order.outlet.windowEndMin);

export const toTodaysDeliveryDTO = (order) => ({
    orderId: order.id,
    reference: order.reference,
    tempClass: order.tempClass,
    status: order.status,
    window: toDeliveryWindow(order),
    predictedArrival: order.allocation?.stop.predictedArrival ?? null,
});

export const toCurrentDeliveryDTO = (order) => ({
    orderId: order.id,
    reference: order.reference,
    tripCode: order.allocation.stop.trip.code,
    vehicleCode: order.allocation.stop.trip.vehicle.code,
    driverName: order.allocation.stop.trip.driver?.fullName ?? null,
    stopSequence: order.allocation.stop.sequence,
    predictedArrival: order.allocation.stop.predictedArrival ?? null,
});

export const toStoreManagerDashboardDTO = ({ date, kpis, deliveries, currentDelivery, recentIssues }) => ({
    date,
    kpis,
    deliveries,
    currentDelivery,
    recentIssues,
});

// ---- loader ----

export const toLoaderDashboardDTO = ({ date, summary }) => ({ date, summary });

// ---- health ----

export const toRefrigeratedCapacityDTO = ({ plannedWeightKg, capacityWeightKg, usedRatio }) => ({
    plannedWeightKg: toNumber(plannedWeightKg) ?? 0,
    capacityWeightKg,
    usedRatio,
});
