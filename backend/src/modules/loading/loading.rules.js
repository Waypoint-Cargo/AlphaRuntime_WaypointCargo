import crypto from "node:crypto";

/**
 *  Loading rules - pure functions, no I/O.
 *
 *  Builds the "task model" the service and DTO layers work from: the trip's LIVE plan
 *  (stops -> allocated orders -> order lines) laid over the loader's saved quantities
 *  (LoadingItemCheck rows). Because the plan is re-read every time, a task is never served
 *  from a stale snapshot; the saved rows only remember what has been physically loaded.
 *
 *  Vocabulary used everywhere in this module:
 *    - "items"  = units, i.e. the sum of order-line quantities (same meaning as Order.itemCount)
 *    - "lines"  = order lines (OrderItem rows); always called lines / lineCount, never items
 */

// Orders a loader may load: planned onto this trip, or already loaded by an earlier pass.
export const LOADABLE_ORDER_STATUSES = ["PLANNED", "PARTIALLY_LOADED", "LOADED"];

// Plans whose trips are in the shared loading pool. A trip becomes a loading task the moment the dispatcher allocates an
// order to it (the plan is then DRAFT); publishing only commits the plan. Once a loader starts a trip it is LOADING and
// the dispatcher can no longer take orders off it, so an unpublished plan cannot pull the load from under a loader.
// COMPLETED plans stay readable (Completed tab) but are not loadable.
export const POOL_PLAN_STATUSES = ["CLOSED", "DRAFT", "PUBLISHED", "IN_EXECUTION"];
export const VISIBLE_PLAN_STATUSES = [...POOL_PLAN_STATUSES, "COMPLETED"];

// A trip still waiting for (or in the middle of) loading.
export const PENDING_TRIP_STATUSES = ["PLANNED", "LOADING"];

// Sessions that have not finished: the Pending tab shows these (plus trips that have no session yet).
export const OPEN_SESSION_STATUSES = ["IN_PROGRESS", "PAUSED", "ON_HOLD"];

// Line statuses set by a shortfall report. Such a line is "accepted short" once the hold is released.
export const FLAGGED_CHECK_STATUSES = ["SHORT", "DAMAGED", "WRONG_ITEM"];

const TEMP_RANK = { AMBIENT: 0, CHILLED: 1, FROZEN: 2 };
const BRAND_ORDER = ["FRESH", "STYLE", "TECH"];

// Sri Lanka has no daylight saving: Asia/Colombo is always UTC+05:30.
const COLOMBO_OFFSET_MIN = 330;

// Fresh stores open at 08:00. A route with a stop whose window closes by then is time-critical.
const FRESH_OPENING_MIN = 480;

const toNumber = (value) => (value === null || value === undefined ? 0 : Number(value));
const round2 = (value) => Math.round(value * 100) / 100;
const secondsBetween = (from, to) => Math.max(Math.floor((to.getTime() - from.getTime()) / 1000), 0);

// Minutes after midnight in Asia/Colombo, comparable with Outlet.windowStartMin / windowEndMin.
export const colomboMinutes = (date) =>
    (date.getUTCHours() * 60 + date.getUTCMinutes() + COLOMBO_OFFSET_MIN) % 1440;

const formatMinutes = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// What a line's status should be after a quantity change. A shortfall flag survives quantity edits.
export const deriveLineStatus = ({ storedStatus, loadedQty, plannedQty }) => {
    if (FLAGGED_CHECK_STATUSES.includes(storedStatus)) return storedStatus;
    return plannedQty > 0 && loadedQty >= plannedQty ? "VERIFIED" : "PENDING";
};

// Publishing a plan registers an empty session for every trip (planning.service). The column default makes it
// IN_PROGRESS, but nobody has started it - no holder, no start time - so it is a PENDING task like a trip with no
// session at all. A session someone really started always has startedAt; one whose holder was deleted keeps it.
export const isUnstartedSession = (session) =>
    Boolean(session) && session.status === "IN_PROGRESS" && !session.startedAt && !session.lockedById && !session.completedAt;

// A lock past its expiry (or one whose holder was deleted) may be taken over by another loader.
export const isLockExpired = (session, now) =>
    !session.lockExpiresAt || session.lockExpiresAt.getTime() <= now.getTime();

const toLine = ({ item, order, check }) => {
    const plannedQty = item.quantity;
    const loadedQty = check?.loadedQty ?? 0;
    const shortQty = check?.shortQty ?? 0;
    return {
        orderItemId: item.id,
        orderId: order.id,
        orderReference: order.reference,
        lineNo: item.lineNo,
        itemCode: item.sku ?? null,
        itemName: item.itemName,
        unit: item.unit,
        tempClass: order.tempClass,
        plannedQty,
        loadedQty,
        remainingQty: Math.max(plannedQty - loadedQty, 0),
        // plannedQty can shrink after loading began; the surplus has to be taken off the vehicle
        excessQty: Math.max(loadedQty - plannedQty, 0),
        // units reported short / damaged / wrong can never be loaded
        maxLoadableQty: Math.max(plannedQty - shortQty, 0),
        shortQty,
        status: deriveLineStatus({ storedStatus: check?.status, loadedQty, plannedQty }),
        note: check?.note ?? null,
        checkedAt: check?.checkedAt ?? null,
    };
};

// Totals for a set of lines. loadedItems is capped per line so progress never exceeds 100 %.
export const sumLines = (lines) => {
    let totalItems = 0;
    let loadedItems = 0;
    let remainingItems = 0;
    let excessItems = 0;
    let loadedLines = 0;
    for (const line of lines) {
        totalItems += line.plannedQty;
        loadedItems += Math.min(line.loadedQty, line.plannedQty);
        remainingItems += line.remainingQty;
        excessItems += line.excessQty;
        if (line.remainingQty === 0 && line.excessQty === 0) loadedLines += 1;
    }
    return {
        totalItems,
        loadedItems,
        remainingItems,
        excessItems,
        // floor, not round: 99.6 % must not read as 100 % while items are still missing.
        // Multiply first: (29 / 100) * 100 is 28.999... in floating point and would read 28.
        percent: totalItems > 0 ? Math.floor((loadedItems * 100) / totalItems) : 0,
        totalLines: lines.length,
        loadedLines,
    };
};

// LOADED / SHORT / NOT_STARTED / IN_PROGRESS. A stop left short on a finished load, or one with a shortfall flag, is SHORT.
const deriveStopStatus = (progress, lines, isFrozen) => {
    if (progress.remainingItems === 0 && progress.excessItems === 0) return "LOADED";
    const flagged = lines.some((line) => FLAGGED_CHECK_STATUSES.includes(line.status));
    if (progress.remainingItems > 0 && (isFrozen || flagged)) return "SHORT";
    return progress.loadedItems === 0 ? "NOT_STARTED" : "IN_PROGRESS";
};

// Fingerprint of the plan as the loader must see it (stop order, lines, quantities).
// Clients echo it back on writes; a mismatch means the dispatcher changed the plan under them.
export const computePlanRevision = (stopEntries) => {
    const hash = crypto.createHash("sha1");
    for (const { stop, lines } of stopEntries) {
        hash.update(`${stop.sequence}|${stop.id}\n`);
        for (const line of lines) hash.update(`${line.orderItemId}|${line.plannedQty}\n`);
    }
    return hash.digest("hex").slice(0, 16);
};

// Hard constraints (violations) stop loading from starting or completing; warnings only inform.
const detectConstraints = ({ trip, stopEntries, orders, status, now }) => {
    const vehicle = trip.vehicle;
    const violations = [];
    const warnings = [];

    const weightKg = round2(orders.reduce((sum, order) => sum + toNumber(order.totalWeightKg), 0));
    const volumeM3 = round2(orders.reduce((sum, order) => sum + toNumber(order.totalVolumeM3), 0));

    // A finished load is history: what the vehicle looks like today no longer matters for it.
    if (status === "COMPLETED") return { violations, warnings, weightKg, volumeM3 };

    if (!vehicle.isActive || vehicle.status === "MAINTENANCE") {
        violations.push({
            code: "VEHICLE_UNAVAILABLE",
            message: `Vehicle ${vehicle.code} is ${vehicle.isActive ? "under maintenance" : "deactivated"} and cannot be loaded.`,
        });
    }

    // Only refrigerated vehicles may carry chilled or frozen goods.
    const coldOrders = orders.filter((order) => order.tempClass !== "AMBIENT");
    if (coldOrders.length > 0 && !vehicle.isRefrigerated) {
        violations.push({
            code: "TEMPERATURE_MISMATCH",
            message: `Chilled or frozen goods cannot be loaded onto ambient vehicle ${vehicle.code}.`,
            orderReferences: coldOrders.map((order) => order.reference),
        });
    }

    // van_only outlets cannot be served by trucks. The order snapshot wins over the outlet row (same rule as the DB trigger).
    if (vehicle.type !== "VAN") {
        const vanOnlyStops = stopEntries.filter(({ stop, orders: stopOrders }) =>
            stopOrders.some((order) => order.vanOnly ?? stop.outlet.vanOnly),
        );
        if (vanOnlyStops.length > 0) {
            violations.push({
                code: "VAN_ONLY_OUTLET",
                message: `${vanOnlyStops.map(({ stop }) => stop.outlet.code).join(", ")} can only be served by a van, not ${vehicle.code}.`,
                outletCodes: vanOnlyStops.map(({ stop }) => stop.outlet.code),
            });
        }
    }

    // A load must fit both the weight limit and the volume limit.
    if (weightKg > toNumber(vehicle.maxWeightKg)) {
        violations.push({
            code: "WEIGHT_LIMIT_EXCEEDED",
            message: `The load (${weightKg} kg) exceeds the weight limit of ${vehicle.code} (${toNumber(vehicle.maxWeightKg)} kg).`,
        });
    }
    if (volumeM3 > toNumber(vehicle.maxVolumeM3)) {
        violations.push({
            code: "VOLUME_LIMIT_EXCEEDED",
            message: `The load (${volumeM3} m3) exceeds the volume limit of ${vehicle.code} (${toNumber(vehicle.maxVolumeM3)} m3).`,
        });
    }

    if (vehicle.status === "ON_ROUTE") {
        warnings.push({
            code: "VEHICLE_ON_ROUTE",
            message: `Vehicle ${vehicle.code} is still marked as on route.`,
        });
    }

    // Delivery windows are the dispatcher's call, so they only warn: loading late would not make them better.
    for (const { stop, orders: stopOrders } of stopEntries) {
        if (!stop.plannedArrival) continue;
        const outlet = stop.outlet;
        const useMallWindow = outlet.isMall && outlet.mallAccessStartMin !== null && outlet.mallAccessEndMin !== null;
        const startMin = useMallWindow ? outlet.mallAccessStartMin : (stopOrders[0]?.windowStartMin ?? outlet.windowStartMin);
        const endMin = useMallWindow ? outlet.mallAccessEndMin : (stopOrders[0]?.windowEndMin ?? outlet.windowEndMin);
        const arrival = colomboMinutes(stop.plannedArrival);
        if (arrival < startMin || arrival > endMin) {
            warnings.push({
                code: "WINDOW_AT_RISK",
                message: `Planned arrival at ${outlet.code} is ${formatMinutes(arrival)}, outside its ${formatMinutes(startMin)}-${formatMinutes(endMin)} window.`,
                outletCode: outlet.code,
            });
        }
    }

    if (trip.plannedDeparture && trip.plannedDeparture.getTime() < now.getTime()) {
        warnings.push({
            code: "DEPARTURE_PASSED",
            message: `Planned departure (${formatMinutes(colomboMinutes(trip.plannedDeparture))}) has passed.`,
        });
    }

    return { violations, warnings, weightKg, volumeM3 };
};

// The hint on the Home screen: what the signed-in loader should do next.
const deriveNextStep = (pending) => {
    const mine = pending.find((model) => model.lock?.isMine);
    if (mine) {
        return {
            type: "RESUME_LOADING",
            title: `Continue loading ${mine.routeCode}.`,
            message: "You have a load in progress.",
            count: 1,
            tripId: mine.tripId,
            routeCode: mine.routeCode,
        };
    }
    const startable = pending.filter((model) => model.actions.canStart);
    if (startable.length > 0) {
        return {
            type: "START_LOADING",
            title: "You have loads ready to begin.",
            message: "View your ready loads and start loading.",
            count: startable.length,
            tripId: startable[0].tripId,
            routeCode: startable[0].routeCode,
        };
    }
    if (pending.some((model) => model.status === "ON_HOLD")) {
        return {
            type: "AWAITING_REVIEW",
            title: "A load is waiting on the dispatcher.",
            message: "A shortfall was reported. The dispatcher will review it.",
            count: pending.filter((model) => model.status === "ON_HOLD").length,
            tripId: null,
            routeCode: null,
        };
    }
    if (pending.length > 0) {
        return {
            type: "WAITING",
            title: "Nothing for you to start right now.",
            message: "The remaining loads are with other loaders or need the dispatcher.",
            count: pending.length,
            tripId: null,
            routeCode: null,
        };
    }
    return {
        type: "ALL_CLEAR",
        title: "You're all caught up.",
        message: "There are no loads waiting right now.",
        count: 0,
        tripId: null,
        routeCode: null,
    };
};

// Figures for the Home screen. `models` are the day's tasks at the loader's depots, earliest departure first.
export const summarizeDay = (models) => {
    const pending = models.filter((model) => model.tab === "pending");
    const byStatus = { PENDING: 0, IN_PROGRESS: 0, PAUSED: 0, ON_HOLD: 0, COMPLETED: 0 };
    for (const model of models) if (model.tab !== null) byStatus[model.status] += 1;

    return {
        pendingLoads: pending.length,
        // loading finished, vehicle waiting for its driver
        readyToDepart: models.filter((model) => model.status === "COMPLETED" && model.tripStatus === "LOADED").length,
        itemsToLoad: pending.reduce((sum, model) => sum + model.progress.remainingItems, 0),
        departures: models.length,
        departuresRemaining: models.filter((model) => ["PLANNED", "LOADING", "LOADED"].includes(model.tripStatus)).length,
        byStatus,
        nextStep: deriveNextStep(pending),
    };
};

// Everything that stops "Review & Complete" right now.
export const computeCompletionBlockers = (model) => {
    const blockers = [];

    if (model.progress.totalItems === 0) {
        blockers.push({ code: "NOTHING_TO_LOAD", message: "There is nothing to load on this route." });
    }
    if (model.violations.length > 0) {
        blockers.push({
            code: "PLAN_CONSTRAINT_VIOLATION",
            message: "The plan breaks an operating constraint. Ask the dispatcher to fix it.",
            violations: model.violations.map((violation) => violation.code),
        });
    }

    // A short line is fine only once a shortfall has been recorded for it (and the dispatcher released the hold).
    const unloaded = model.lines.filter(
        (line) => line.remainingQty > 0 && !FLAGGED_CHECK_STATUSES.includes(line.status),
    );
    if (unloaded.length > 0) {
        const items = unloaded.reduce((sum, line) => sum + line.remainingQty, 0);
        blockers.push({
            code: "LINES_NOT_LOADED",
            count: unloaded.length,
            items,
            message: `${unloaded.length} line(s) are not fully loaded (${items} items remaining). Load them or report a shortfall.`,
        });
    }

    const excess = model.lines.filter((line) => line.excessQty > 0);
    if (excess.length > 0) {
        const items = excess.reduce((sum, line) => sum + line.excessQty, 0);
        blockers.push({
            code: "EXCESS_LOADED",
            count: excess.length,
            items,
            message: `${items} item(s) are loaded beyond the plan. Remove them before completing.`,
        });
    }

    if (model.removedLines.length > 0) {
        const items = model.removedLines.reduce((sum, line) => sum + line.loadedQty, 0);
        blockers.push({
            code: "REMOVED_LINES_STILL_LOADED",
            count: model.removedLines.length,
            items,
            message: `${items} item(s) belong to orders that were taken off this route. Unload them first.`,
        });
    }

    return blockers;
};

/**
 *  Builds the task model for one trip.
 *
 *  @param {object} args.trip      trip graph as selected by loading.repository (live plan + session + checks)
 *  @param {string} [args.viewerId] the signed-in loader, used for lock.isMine
 *  @param {Date}   [args.now]
 *  @param {number} [args.lockTtlSec]
 */
export const buildTaskModel = ({ trip, viewerId = null, now = new Date(), lockTtlSec = 900 }) => {
    const session = trip.loadingSession ?? null;
    // No session row yet = the task is still waiting in the shared pool.
    const status = !session || isUnstartedSession(session) ? "PENDING" : session.status;
    // A finished load is a record, not a plan: keep every order that was on it, whatever happened to the orders since.
    const isFrozen = status === "COMPLETED";
    const checks = session?.checks ?? [];
    const checkByItemId = new Map(checks.map((check) => [check.orderItemId, check]));

    const stopEntries = [];
    const orders = [];
    const liveItemIds = new Set();

    for (const stop of trip.stops) {
        const stopOrders = stop.allocations
            .map((allocation) => allocation.order)
            .filter((order) => isFrozen || LOADABLE_ORDER_STATUSES.includes(order.status))
            .sort((a, b) => a.reference.localeCompare(b.reference));
        if (stopOrders.length === 0) continue;

        const lines = [];
        for (const order of stopOrders) {
            orders.push(order);
            for (const item of order.items) {
                liveItemIds.add(item.id);
                lines.push(toLine({ item, order, check: checkByItemId.get(item.id) }));
            }
        }
        stopEntries.push({ stop, orders: stopOrders, lines });
    }

    const allLines = stopEntries.flatMap((entry) => entry.lines);
    const progress = sumLines(allLines);

    // Saved quantities for lines that left the plan after loading began. They are still on the vehicle until unloaded.
    const removedLines = isFrozen
        ? []
        : checks
              .filter((check) => !liveItemIds.has(check.orderItemId) && (check.loadedQty ?? 0) > 0)
              .map((check) => ({
                  orderItemId: check.orderItemId,
                  orderReference: check.orderItem?.order?.reference ?? null,
                  outletName: check.orderItem?.order?.outlet?.name ?? null,
                  itemCode: check.orderItem?.sku ?? null,
                  itemName: check.orderItem?.itemName ?? null,
                  loadedQty: check.loadedQty,
              }));

    const unitsByBrand = {};
    for (const order of orders) {
        const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
        unitsByBrand[order.brand] = (unitsByBrand[order.brand] ?? 0) + units;
    }
    const brands = BRAND_ORDER.filter((brand) => unitsByBrand[brand] > 0);
    // the brand carrying the most units; ties go to the earlier brand in BRAND_ORDER
    const brand = brands.reduce((best, current) => (best === null || unitsByBrand[current] > unitsByBrand[best] ? current : best), null);

    const tempRequirement = orders.reduce(
        (highest, order) => (TEMP_RANK[order.tempClass] > TEMP_RANK[highest] ? order.tempClass : highest),
        "AMBIENT",
    );

    // Derived, because the plan has no priority column: perishable goods or a store that opens early are time-critical.
    const closesBeforeOpening = stopEntries.some(({ stop, orders: stopOrders }) => {
        const windowEnd = stopOrders[0]?.windowEndMin ?? stop.outlet.windowEndMin;
        return windowEnd !== null && windowEnd !== undefined && windowEnd <= FRESH_OPENING_MIN;
    });
    const priority = tempRequirement !== "AMBIENT" || closesBeforeOpening ? "HIGH" : "NORMAL";

    const { violations, warnings, weightKg, volumeM3 } = detectConstraints({ trip, stopEntries, orders, status, now });

    const stops = stopEntries.map(({ stop, orders: stopOrders, lines }, index) => {
        const stopProgress = sumLines(lines);
        return {
            stopId: stop.id,
            sequence: stop.sequence,
            // goods leave the vehicle in stop order, so the last stop is loaded first
            loadPosition: stopEntries.length - index,
            outlet: stop.outlet,
            plannedArrival: stop.plannedArrival,
            orders: stopOrders.map((order) => ({
                id: order.id,
                reference: order.reference,
                tempClass: order.tempClass,
                status: order.status,
            })),
            lines,
            progress: stopProgress,
            status: deriveStopStatus(stopProgress, lines, isFrozen),
        };
    });

    const isOpen = status === "IN_PROGRESS";
    const lock = isOpen
        ? {
              lockedBy: session.lockedBy ?? null,
              isMine: viewerId !== null && session.lockedById === viewerId,
              expiresAt: session.lockExpiresAt,
              isExpired: isLockExpired(session, now),
              ttlSec: lockTtlSec,
          }
        : null;

    const idleNowSec =
        session?.pausedAt && (status === "PAUSED" || status === "ON_HOLD") ? secondsBetween(session.pausedAt, now) : 0;
    const idleSec = (session?.pausedSec ?? 0) + idleNowSec;
    const elapsedSec = session?.startedAt ? secondsBetween(session.startedAt, session.completedAt ?? now) : 0;
    const timing = {
        startedAt: session?.startedAt ?? null,
        completedAt: session?.completedAt ?? null,
        pausedAt: status === "PAUSED" || status === "ON_HOLD" ? session.pausedAt : null,
        elapsedSec,
        idleSec,
        // wall-clock time minus time spent paused or on hold
        loadingSec: Math.max(elapsedSec - idleSec, 0),
    };

    const flaggedLines = allLines.filter((line) => FLAGGED_CHECK_STATUSES.includes(line.status));
    const shortfall =
        flaggedLines.length > 0
            ? {
                  issue: trip.issues?.[0] ?? null,
                  lines: flaggedLines,
                  totalShortItems: flaggedLines.reduce((sum, line) => sum + line.shortQty, 0),
              }
            : null;

    const model = {
        tripId: trip.id,
        routeCode: trip.code,
        tripNumber: trip.tripNumber,
        deliveryDate: trip.deliveryDate,
        tripStatus: trip.status,
        planStatus: trip.plan.status,
        depot: trip.plan.depot,
        plannedDeparture: trip.plannedDeparture,
        vehicle: trip.vehicle,
        sessionId: status === "PENDING" ? null : session.id,
        status,
        // the Tasks tab this task sits in; null for a trip that left without a finished load (not a loader's concern)
        tab: status === "COMPLETED" ? "completed" : PENDING_TRIP_STATUSES.includes(trip.status) ? "pending" : null,
        departedShort: session?.departedShort ?? false,
        startedBy: session?.startedBy ?? null,
        completedBy: session?.completedBy ?? null,
        brand,
        brands,
        priority,
        tempRequirement,
        requiresRefrigeration: tempRequirement !== "AMBIENT",
        weightKg,
        volumeM3,
        orders,
        stops,
        lines: allLines,
        removedLines,
        progress,
        violations,
        warnings,
        lock,
        timing,
        shortfall,
        planRevision: computePlanRevision(stopEntries),
    };

    model.completionBlockers = computeCompletionBlockers(model);

    // What the screen may offer this loader right now, so the client never re-implements the rules.
    const tripLoadable = POOL_PLAN_STATUSES.includes(model.planStatus) && PENDING_TRIP_STATUSES.includes(model.tripStatus);
    const iHoldIt = lock?.isMine === true;
    model.actions = {
        canStart:
            tripLoadable &&
            violations.length === 0 &&
            (status === "PENDING" || status === "PAUSED" || (status === "IN_PROGRESS" && (iHoldIt || lock.isExpired))),
        // always allowed for the holder, so a cancelled or replanned route can still be released
        canPause: iHoldIt,
        canUpdateLines: iHoldIt && tripLoadable,
        canReportShortfall: iHoldIt && tripLoadable,
        canComplete: iHoldIt && tripLoadable && model.completionBlockers.length === 0,
    };

    return model;
};
