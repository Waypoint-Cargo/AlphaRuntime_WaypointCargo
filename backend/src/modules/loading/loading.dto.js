/**
 *  DTO - Data Transfer Object
 *  These transformers strip internal data and produce the exact shape
 *  that the API layer should send back to the client.
 *
 * RULE:
 *   Nothing from the service layer should reach the controller as a raw
 *   Prisma object. Always pass through a DTO transformer first.
 *
 * VOCABULARY (the same on every screen):
 *   "items" = units, the sum of order-line quantities (same meaning as Order.itemCount)
 *   "lines" = order lines; always named lines / lineCount / totalLines, never "items"
 */

// Prisma Decimal -> plain JS number (or null), so the wire format is a JSON number, not a Decimal string.
const toNum = (value) => (value === null || value === undefined ? null : Number(value));
const dateOnly = (value) => (value ? value.toISOString().slice(0, 10) : null);
const percentOf = (part, whole) => (whole > 0 ? Math.min(Math.round((part / whole) * 100), 100) : 0);

const toUserRefDTO = (user) => (user ? { id: user.id, fullName: user.fullName } : null);

const toDepotDTO = (depot) => ({ id: depot.id, code: depot.code, name: depot.name });

const toVehicleDTO = (vehicle) => ({
    id: vehicle.id,
    code: vehicle.code,
    type: vehicle.type,
    isRefrigerated: vehicle.isRefrigerated,
    status: vehicle.status,
    maxWeightKg: toNum(vehicle.maxWeightKg),
    maxVolumeM3: toNum(vehicle.maxVolumeM3),
});

const toProgressDTO = (progress) => ({
    totalItems: progress.totalItems,
    loadedItems: progress.loadedItems,
    remainingItems: progress.remainingItems,
    excessItems: progress.excessItems,
    percent: progress.percent,
    totalLines: progress.totalLines,
    loadedLines: progress.loadedLines,
});

const toLockDTO = (lock) =>
    lock
        ? {
              heldBy: toUserRefDTO(lock.lockedBy),
              isMine: lock.isMine,
              expiresAt: lock.expiresAt,
              isExpired: lock.isExpired,
              ttlSec: lock.ttlSec,
          }
        : null;

const toTimingDTO = (timing) => ({
    startedAt: timing.startedAt,
    completedAt: timing.completedAt,
    pausedAt: timing.pausedAt,
    elapsedSec: timing.elapsedSec,
    idleSec: timing.idleSec,
    loadingSec: timing.loadingSec,
});

const toIssueDTO = (issue) =>
    issue
        ? {
              id: issue.id,
              reference: issue.reference,
              status: issue.status,
              description: issue.description,
              reportedAt: issue.createdAt,
              reportedBy: toUserRefDTO(issue.reportedBy),
          }
        : null;

const toLineDTO = (line) => ({
    orderItemId: line.orderItemId,
    orderId: line.orderId,
    orderReference: line.orderReference,
    lineNo: line.lineNo,
    itemCode: line.itemCode,
    itemName: line.itemName,
    unit: line.unit,
    tempClass: line.tempClass,
    plannedQty: line.plannedQty,
    loadedQty: line.loadedQty,
    remainingQty: line.remainingQty,
    excessQty: line.excessQty,
    maxLoadableQty: line.maxLoadableQty,
    status: line.status,
    shortQty: line.shortQty,
    note: line.note,
    checkedAt: line.checkedAt,
});

const toOutletDTO = (outlet) => ({
    id: outlet.id,
    code: outlet.code,
    name: outlet.name,
    district: outlet.district,
    brand: outlet.brand,
    vanOnly: outlet.vanOnly,
    isMall: outlet.isMall,
    unloadingType: outlet.unloadingType,
    window: { startMin: outlet.windowStartMin, endMin: outlet.windowEndMin },
    mallWindow:
        outlet.isMall && outlet.mallAccessStartMin !== null && outlet.mallAccessEndMin !== null
            ? { startMin: outlet.mallAccessStartMin, endMin: outlet.mallAccessEndMin }
            : null,
});

const toStopDTO = (stop) => ({
    stopId: stop.stopId,
    sequence: stop.sequence,
    loadPosition: stop.loadPosition,
    status: stop.status,
    outlet: toOutletDTO(stop.outlet),
    plannedArrival: stop.plannedArrival,
    orders: stop.orders,
    lineCount: stop.progress.totalLines,
    progress: toProgressDTO(stop.progress),
    lines: stop.lines.map(toLineDTO),
});

const toShortfallDTO = (shortfall) => ({
    issue: toIssueDTO(shortfall.issue),
    totalShortItems: shortfall.totalShortItems,
    lines: shortfall.lines.map((line) => ({
        orderItemId: line.orderItemId,
        orderReference: line.orderReference,
        itemCode: line.itemCode,
        itemName: line.itemName,
        status: line.status,
        plannedQty: line.plannedQty,
        loadedQty: line.loadedQty,
        shortQty: line.shortQty,
        note: line.note,
    })),
});

// Fields every task shape starts with (Tasks card, Start Loading header, Loading Completed header).
const toTaskHeaderDTO = (model) => ({
    tripId: model.tripId,
    sessionId: model.sessionId,
    routeCode: model.routeCode,
    tripNumber: model.tripNumber,
    deliveryDate: dateOnly(model.deliveryDate),
    status: model.status,
    tripStatus: model.tripStatus,
    brand: model.brand,
    brands: model.brands,
    priority: model.priority,
    tempRequirement: model.tempRequirement,
    requiresRefrigeration: model.requiresRefrigeration,
    plannedDeparture: model.plannedDeparture,
    depot: toDepotDTO(model.depot),
    vehicle: toVehicleDTO(model.vehicle),
});

const toActionsDTO = (actions) => ({
    canStart: actions.canStart,
    canPause: actions.canPause,
    canUpdateLines: actions.canUpdateLines,
    canReportShortfall: actions.canReportShortfall,
    canComplete: actions.canComplete,
});

// Home screen: the day's figures at the loader's depots.
export const toHomeSummaryDTO = ({ date, summary, openIssues }) => ({
    date,
    pendingLoads: summary.pendingLoads,
    readyToDepart: summary.readyToDepart,
    openIssues,
    itemsToLoad: summary.itemsToLoad,
    departures: summary.departures,
    departuresRemaining: summary.departuresRemaining,
    byStatus: summary.byStatus,
    nextStep: summary.nextStep,
});

// Tasks screen: one card.
export const toTaskListItemDTO = (model) => ({
    ...toTaskHeaderDTO(model),
    outletCount: model.stops.length,
    lineCount: model.progress.totalLines,
    itemCount: model.progress.totalItems,
    progress: toProgressDTO(model.progress),
    lock: toLockDTO(model.lock),
    violations: model.violations.map(({ code, message }) => ({ code, message })),
    actions: toActionsDTO(model.actions),
});

// Tasks screen: a page of cards plus pagination metadata.
export const toTaskListResponseDTO = ({ models, total, page, limit, date, tab }) => ({
    items: models.map(toTaskListItemDTO),
    meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        date,
        tab,
    },
});

// Start Loading screen: the live plan, the saved quantities and what the loader may do next.
export const toTaskDetailDTO = (model) => ({
    ...toTaskHeaderDTO(model),
    outletCount: model.stops.length,
    lineCount: model.progress.totalLines,
    itemCount: model.progress.totalItems,
    load: {
        weightKg: model.weightKg,
        volumeM3: model.volumeM3,
        weightPercent: percentOf(model.weightKg, toNum(model.vehicle.maxWeightKg)),
        volumePercent: percentOf(model.volumeM3, toNum(model.vehicle.maxVolumeM3)),
    },
    progress: toProgressDTO(model.progress),
    timing: toTimingDTO(model.timing),
    lock: toLockDTO(model.lock),
    planRevision: model.planRevision,
    violations: model.violations,
    warnings: model.warnings,
    actions: toActionsDTO(model.actions),
    completionBlockers: model.completionBlockers,
    shortfall: model.shortfall ? toShortfallDTO(model.shortfall) : null,
    removedLines: model.removedLines,
    stops: model.stops.map(toStopDTO),
});

// Review & Complete / Loading Completed screens: totals and one row per outlet, no item lines.
export const toTaskSummaryDTO = (model) => ({
    ...toTaskHeaderDTO(model),
    startedAt: model.timing.startedAt,
    completedAt: model.timing.completedAt,
    loadingSec: model.timing.loadingSec,
    elapsedSec: model.timing.elapsedSec,
    idleSec: model.timing.idleSec,
    departedShort: model.status === "COMPLETED" ? model.departedShort : model.progress.remainingItems > 0,
    completedBy: toUserRefDTO(model.completedBy),
    progress: toProgressDTO(model.progress),
    outlets: model.stops.map((stop) => ({
        stopId: stop.stopId,
        sequence: stop.sequence,
        outlet: { id: stop.outlet.id, code: stop.outlet.code, name: stop.outlet.name, district: stop.outlet.district },
        orderReferences: stop.orders.map((order) => order.reference),
        lineCount: stop.progress.totalLines,
        totalItems: stop.progress.totalItems,
        loadedItems: stop.progress.loadedItems,
        remainingItems: stop.progress.remainingItems,
        status: stop.status,
    })),
    shortfall: model.shortfall ? toShortfallDTO(model.shortfall) : null,
    completion: {
        canComplete: model.actions.canComplete,
        willDepartShort: model.progress.remainingItems > 0,
        blockers: model.completionBlockers,
    },
    planRevision: model.planRevision,
});

// A quantity save: only the lines that changed, plus the numbers the screen redraws.
// removedLines carry just id + quantity here; the screen already has their labels from the task detail.
export const toLineUpdateDTO = ({ model, updatedItemIds }) => ({
    lines: model.lines.filter((line) => updatedItemIds.includes(line.orderItemId)).map(toLineDTO),
    removedLines: model.removedLines.map(({ orderItemId, loadedQty }) => ({ orderItemId, loadedQty })),
    stops: model.stops.map((stop) => ({
        stopId: stop.stopId,
        status: stop.status,
        progress: toProgressDTO(stop.progress),
    })),
    progress: toProgressDTO(model.progress),
    lock: toLockDTO(model.lock),
    canComplete: model.actions.canComplete,
    planRevision: model.planRevision,
});

// The reason the loader typed is stored in front of the generated "N line(s) short: ..." summary; give back only the reason.
const reasonOf = (description) => {
    if (!description) return null;
    const match = description.match(/^(?:(.*?)\.\s)?\d+ line\(s\) short: /s);
    if (!match) return description;
    return match[1]?.trim() || null;
};

// Issues screen: one shortfall report with the lines it flagged.
export const toLoaderIssueDTO = (issue) => {
    const lines = issue.loadingChecks.map((check) => ({
        orderItemId: check.orderItem.id,
        orderReference: check.orderItem.order.reference,
        itemCode: check.orderItem.sku ?? null,
        lineNo: check.orderItem.lineNo,
        itemName: check.orderItem.itemName,
        status: check.status,
        plannedQty: check.plannedQty,
        loadedQty: check.loadedQty ?? 0,
        shortQty: check.shortQty,
        availableQty: Math.max(check.plannedQty - check.shortQty, 0),
        note: check.note ?? null,
    }));
    return {
        id: issue.id,
        reference: issue.reference,
        status: issue.status,
        isResolved: issue.status === "RESOLVED",
        reason: reasonOf(issue.description),
        reportedAt: issue.createdAt,
        reportedBy: toUserRefDTO(issue.reportedBy),
        resolvedAt: issue.resolvedAt,
        resolvedBy: toUserRefDTO(issue.resolvedBy),
        resolutionNote: issue.resolutionNote ?? null,
        trip: issue.trip ? { id: issue.trip.id, routeCode: issue.trip.code } : null,
        orderReferences: [...new Set(lines.map((line) => line.orderReference))],
        totalShortItems: lines.reduce((sum, line) => sum + line.shortQty, 0),
        lines,
    };
};

export const toLoaderIssueListDTO = ({ issues, counts, tab, limit }) => ({
    items: issues.map(toLoaderIssueDTO),
    meta: { tab, limit, total: tab === "resolved" ? counts.resolved : counts.pending, counts },
});
