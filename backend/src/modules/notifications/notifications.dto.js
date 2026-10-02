// ---- client shape ----

export const toNotificationDTO = (row) => ({
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    action: row.action ?? null,
    isRead: row.readAt !== null && row.readAt !== undefined,
    readAt: row.readAt ?? null,
    createdAt: row.createdAt,
});

export const toNotificationListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toNotificationDTO),
    pagination: { page, pageSize, total },
});

export const toUnreadCountDTO = (count) => ({ count });

// ---- notification text builders ----
// Every notification's wording lives here, one pure builder per event type.
// A builder returns the payload notifyUsersTx(tx, userIds, payload) expects:
//   { type, severity, title, body, entityType?, entityId?, action? }
// Later modules add their own builders below.

const formatRole = (role) =>
    String(role)
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

export const buildUserApprovedNotification = ({ userId, role }) => ({
    type: "USER_APPROVED",
    severity: "SUCCESS",
    title: "Account approved",
    body: `Your account has been approved. You now have access as ${formatRole(role)}.`,
    entityType: "User",
    entityId: userId,
});

export const buildUserScopeChangedNotification = ({ userId, role }) => ({
    type: "USER_SCOPE_CHANGED",
    severity: "INFO",
    title: "Your access was updated",
    body: `An administrator updated your access. You are now ${formatRole(role)}. Please sign in again.`,
    entityType: "User",
    entityId: userId,
});

// ---- prompt 2: orders, planning, trips ----

// Deferral reasons in the words each audience should see (dispatchers: precise, store managers: plain).
const DEFERRAL_REASON_LABELS = {
    CAPACITY_UNAVAILABLE: {
        dispatcher: "Capacity unavailable",
        storeManager: "Our delivery capacity for that day was fully booked.",
    },
    DELIVERY_WINDOW_CONFLICT: {
        dispatcher: "Delivery window conflict",
        storeManager: "We could not reach your outlet within its delivery window.",
    },
    VEHICLE_RESTRICTION: {
        dispatcher: "Vehicle restriction",
        storeManager: "No suitable vehicle was available for your outlet's access requirements.",
    },
    FUEL_LIMITATION: {
        dispatcher: "Fuel limitation",
        storeManager: "Transport resources were limited for that day.",
    },
    LOADING_SHORTFALL: {
        dispatcher: "Loading shortfall",
        storeManager: "The goods could not be fully loaded in time.",
    },
    OTHER: {
        dispatcher: "Other",
        storeManager: "Operational reasons.",
    },
};

// audience: "dispatcher" | "storeManager"
export const deferralReasonLabel = (reason, audience = "dispatcher") =>
    reason ? (DEFERRAL_REASON_LABELS[reason]?.[audience] ?? reason) : null;

export const buildOrderRolledOverNotification = ({ orderId, reference, requestedDate, deliveryDate }) => ({
    type: "ORDER_ROLLED_OVER",
    severity: "WARNING",
    title: "Order moved to the next run",
    body:
        `Order ${reference} cannot be delivered on ${requestedDate} (not an operating day, or the order cut-off has passed). ` +
        `It is scheduled for ${deliveryDate} instead.`,
    entityType: "Order",
    entityId: orderId,
});

export const buildOrderConfirmedNotification = ({ orderId, reference, deliveryDate, previousDeliveryDate }) => ({
    type: "ORDER_CONFIRMED",
    severity: "SUCCESS",
    title: "Order confirmed",
    body:
        `Order ${reference} is confirmed for delivery on ${deliveryDate}.` +
        (previousDeliveryDate && previousDeliveryDate !== deliveryDate
            ? ` The cut-off for ${previousDeliveryDate} had passed, so it moved to the next run.`
            : ""),
    entityType: "Order",
    entityId: orderId,
});

export const buildOrderPlannedNotification = ({ orderId, reference, deliveryDate, tripCode, windowStart, windowEnd }) => ({
    type: "ORDER_PLANNED",
    severity: "INFO",
    title: "Delivery scheduled",
    body:
        `Order ${reference} is scheduled for ${deliveryDate} on route ${tripCode}. ` +
        `Please be ready to receive it between ${windowStart} and ${windowEnd}.`,
    entityType: "Order",
    entityId: orderId,
});

export const buildOrderDeferredNotification = ({ orderId, reference, reason, toDate }) => ({
    type: "ORDER_DEFERRED",
    severity: "WARNING",
    title: "Order moved to the next run",
    body: `Order ${reference} has been moved to ${toDate}. ${deferralReasonLabel(reason, "storeManager") ?? ""}`.trim(),
    entityType: "Order",
    entityId: orderId,
});

export const buildOrderReplannedNotification = ({ orderId, reference, deliveryDate }) => ({
    type: "ORDER_REPLANNED",
    severity: "INFO",
    title: "Order back in planning",
    body: `Order ${reference} is back in planning for delivery on ${deliveryDate}.`,
    entityType: "Order",
    entityId: orderId,
});

// a route given to a driver: at publish, and when the dispatcher changes a trip's driver
export const buildRouteAssignedNotification = ({ tripId, tripCode, deliveryDate, stopCount }) => ({
    type: "ROUTE_ASSIGNED",
    severity: "INFO",
    title: "Route assigned",
    body:
        `Route ${tripCode} on ${deliveryDate} is assigned to you` +
        (stopCount !== undefined ? ` (${stopCount} ${stopCount === 1 ? "stop" : "stops"}).` : "."),
    entityType: "Trip",
    entityId: tripId,
});

export const buildLoadingReadyNotification = ({ planId, deliveryDate, tripCount }) => ({
    type: "LOADING_READY",
    severity: "INFO",
    title: "Loading tasks ready",
    body: `The plan for ${deliveryDate} is published: ${tripCount} ${tripCount === 1 ? "trip is" : "trips are"} ready for loading.`,
    entityType: "DispatchPlan",
    entityId: planId,
});

export const buildSequenceChangeRequestedNotification = ({ requestId, tripCode, driverName }) => ({
    type: "SEQUENCE_CHANGE_REQUESTED",
    severity: "INFO",
    title: "Stop order change requested",
    body: `${driverName} asked to change the stop order on route ${tripCode}.`,
    entityType: "SequenceChangeRequest",
    entityId: requestId,
    action: "REVIEW_SEQUENCE_REQUEST",
});

export const buildSequenceRequestDecidedNotification = ({ requestId, tripCode, decision }) => ({
    type: "SEQUENCE_REQUEST_DECIDED",
    severity: decision === "APPROVED" ? "SUCCESS" : "WARNING",
    title: decision === "APPROVED" ? "Stop order change approved" : "Stop order change rejected",
    body: `Your stop order change on route ${tripCode} was ${decision === "APPROVED" ? "approved" : "rejected"}.`,
    entityType: "SequenceChangeRequest",
    entityId: requestId,
});

// ---- prompt 3: issues, loading, deliveries, receipts ----

const ISSUE_TYPE_LABELS = {
    MISSING_ITEM: "Missing item",
    DAMAGED_ITEM: "Damaged item",
    WRONG_ITEM: "Wrong item",
    QUANTITY_MISMATCH: "Quantity mismatch",
    QUANTITY_SHORT: "Quantity short",
    LATE_DELIVERY: "Late delivery",
    OUTLET_CLOSED: "Outlet closed",
    VEHICLE_PROBLEM: "Vehicle problem",
    TRAFFIC_DELAY: "Traffic delay",
    LOADING_SHORTFALL: "Loading shortfall",
    SYNC_CONFLICT: "Offline sync conflict",
    OTHER: "Other",
};

export const issueTypeLabel = (type) => ISSUE_TYPE_LABELS[type] ?? type;

// to the depot's dispatchers when someone reports an issue (or the system raises one)
export const buildIssueReportedNotification = ({ issueId, reference, type, reporterName, orderReference }) => ({
    type: "ISSUE_REPORTED",
    severity: "WARNING",
    title: `New issue ${reference}`,
    body:
        `${issueTypeLabel(type)} reported` +
        (reporterName ? ` by ${reporterName}` : "") +
        (orderReference ? ` for order ${orderReference}` : "") +
        ".",
    entityType: "Issue",
    entityId: issueId,
    action: "REVIEW_ISSUE",
});

// to the reporter when a dispatcher moves the issue on
export const buildIssueUpdateNotification = ({ issueId, reference, status, resolutionNote }) => ({
    type: "ISSUE_UPDATE",
    severity: status === "RESOLVED" ? "SUCCESS" : "INFO",
    title: status === "RESOLVED" ? `Issue ${reference} resolved` : `Issue ${reference} is being investigated`,
    body:
        status === "RESOLVED"
            ? `Your issue ${reference} was resolved.${resolutionNote ? ` ${resolutionNote}` : ""}`
            : `A dispatcher is looking into your issue ${reference}.`,
    entityType: "Issue",
    entityId: issueId,
});

// audience "dispatcher": trip level; audience "storeManager": the outlet's own order
export const buildLoadingShortfallNotification = ({ audience, tripId, tripCode, orderId, reference, shortItems }) =>
    audience === "storeManager"
        ? {
              type: "LOADING_SHORTFALL",
              severity: "WARNING",
              title: "Order partly loaded",
              body: `Order ${reference} left the depot without ${shortItems === 1 ? "one item" : `${shortItems} items`} that could not be fully loaded. We will let you know about the rest.`,
              entityType: "Order",
              entityId: orderId,
          }
        : {
              type: "LOADING_SHORTFALL",
              severity: "WARNING",
              title: `Route ${tripCode} left short`,
              body: `Loading of route ${tripCode} finished with ${shortItems} short, damaged or wrong ${shortItems === 1 ? "item" : "items"}.`,
              entityType: "Trip",
              entityId: tripId,
              action: "REVIEW_ISSUE",
          };

// to the outlet's store managers when the truck leaves the depot
export const buildTripDepartedNotification = ({ orderId, reference, tripCode }) => ({
    type: "TRIP_DEPARTED",
    severity: "INFO",
    title: "Delivery on the way",
    body: `Order ${reference} has left the depot on route ${tripCode}.`,
    entityType: "Order",
    entityId: orderId,
});

// to the outlet's store managers once the driver has the proof of delivery
export const buildOrderDeliveredNotification = ({ orderId, reference, partial }) => ({
    type: "ORDER_DELIVERED",
    severity: partial ? "WARNING" : "SUCCESS",
    title: partial ? "Order delivered in part" : "Order delivered",
    body: partial
        ? `Order ${reference} was delivered, but not everything arrived as planned. Please confirm what you received.`
        : `Order ${reference} was delivered. Please confirm receipt.`,
    entityType: "Order",
    entityId: orderId,
    action: "CONFIRM_RECEIPT",
});

// to the depot's dispatchers when a stop was only partly delivered
export const buildDeliveryPartialNotification = ({ orderId, reference, outletName }) => ({
    type: "DELIVERY_PARTIAL",
    severity: "WARNING",
    title: "Partial delivery",
    body: `Order ${reference} was only partly delivered to ${outletName}.`,
    entityType: "Order",
    entityId: orderId,
    action: "REVIEW_ISSUE",
});

// audience "dispatcher" or "storeManager"
export const buildDeliveryFailedNotification = ({ audience, orderId, reference, outletName, reason }) =>
    audience === "storeManager"
        ? {
              type: "DELIVERY_FAILED",
              severity: "WARNING",
              title: "Delivery not completed",
              body: `Order ${reference} could not be delivered today (${reason}). We will contact you about a new delivery.`,
              entityType: "Order",
              entityId: orderId,
          }
        : {
              type: "DELIVERY_FAILED",
              severity: "ERROR",
              title: "Delivery failed",
              body: `Order ${reference} was not delivered to ${outletName}: ${reason}.`,
              entityType: "Order",
              entityId: orderId,
              action: "REVIEW_ISSUE",
          };

// to the depot's dispatchers when the outlet confirms the delivery
export const buildReceiptConfirmedNotification = ({ orderId, reference, outletName, withIssues }) => ({
    type: "RECEIPT_CONFIRMED",
    severity: withIssues ? "WARNING" : "SUCCESS",
    title: withIssues ? "Receipt confirmed with issues" : "Receipt confirmed",
    body: `${outletName} confirmed receipt of order ${reference}${withIssues ? " and reported problems" : ""}.`,
    entityType: "Order",
    entityId: orderId,
});
