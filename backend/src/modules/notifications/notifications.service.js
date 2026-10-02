import { AppError } from "../../utils/appError.js";
import {
    countUnreadNotifications,
    createNotificationsTx,
    findDriverIdsOfTrip,
    findStoreManagerIdsOfOutlet,
    findStoreManagerIdsOfOutlets,
    findUserIdsOfDepot,
    findUserNotification,
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "./notifications.repository.js";
import { toNotificationDTO, toNotificationListDTO, toUnreadCountDTO } from "./notifications.dto.js";

// Other modules build their payloads with these, so all wording stays in this module.
export {
    buildDeliveryFailedNotification,
    buildDeliveryPartialNotification,
    buildIssueReportedNotification,
    buildIssueUpdateNotification,
    buildLoadingReadyNotification,
    buildLoadingShortfallNotification,
    buildOrderConfirmedNotification,
    buildOrderDeferredNotification,
    buildOrderDeliveredNotification,
    buildOrderPlannedNotification,
    buildOrderReplannedNotification,
    buildOrderRolledOverNotification,
    buildReceiptConfirmedNotification,
    buildRouteAssignedNotification,
    buildSequenceChangeRequestedNotification,
    buildSequenceRequestDecidedNotification,
    buildTripDepartedNotification,
    buildUserApprovedNotification,
    buildUserScopeChangedNotification,
    deferralReasonLabel,
    issueTypeLabel,
} from "./notifications.dto.js";

// ---- used by other services ----

// Creates one notification per user inside the caller's transaction. Returns how many were created.
export const notifyUsersTx = async (tx, userIds, { type, severity, title, body, entityType, entityId, action }) => {
    if (!type || !title || !body) {
        throw new AppError("Notifications need a type, title and body.", 500, null, false);
    }

    const recipients = [...new Set(userIds ?? [])];
    if (recipients.length === 0) return 0;

    const rows = recipients.map((userId) => ({
        userId,
        type,
        ...(severity && { severity }),
        title,
        body,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        action: action ?? null,
    }));

    const { count } = await createNotificationsTx(tx, rows);
    return count;
};

// Many notifications in one insert: entries are [{ userIds, payload }], payloads as for notifyUsersTx.
// Returns how many rows were created.
export const notifyManyTx = async (tx, entries) => {
    const rows = [];
    for (const { userIds, payload } of entries) {
        const { type, severity, title, body, entityType, entityId, action } = payload;
        if (!type || !title || !body) {
            throw new AppError("Notifications need a type, title and body.", 500, null, false);
        }
        for (const userId of new Set(userIds ?? [])) {
            rows.push({
                userId,
                type,
                ...(severity && { severity }),
                title,
                body,
                entityType: entityType ?? null,
                entityId: entityId ?? null,
                action: action ?? null,
            });
        }
    }
    if (rows.length === 0) return 0;

    const { count } = await createNotificationsTx(tx, rows);
    return count;
};

// Recipient helpers: each returns the ids of ACTIVE + APPROVED users only,
// ready to pass to notifyUsersTx.
export const storeManagersOfOutlet = (outletId) => findStoreManagerIdsOfOutlet(outletId);

// store managers of several outlets: Map(outletId -> userIds)
export const storeManagersOfOutlets = (outletIds) => findStoreManagerIdsOfOutlets(outletIds);

export const usersOfDepot = (depotId, role) => findUserIdsOfDepot(depotId, role);

// the trip's driver as a 0-or-1 element array
export const driverOfTrip = (tripId) => findDriverIdsOfTrip(tripId);

// ---- endpoints (signed-in user only) ----

export const listNotificationsService = async ({ userId, unread, page, pageSize }) => {
    const where = { userId, ...(unread && { readAt: null }) };
    const { rows, total } = await listNotifications({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toNotificationListDTO(rows, { page, pageSize, total });
};

export const getUnreadCountService = async ({ userId }) => {
    return toUnreadCountDTO(await countUnreadNotifications(userId));
};

export const markNotificationReadService = async ({ userId, id }) => {
    await markNotificationRead(id, userId, new Date());

    // the row must belong to the user, whether it was just read or already was
    const notification = await findUserNotification(id, userId);
    if (!notification) throw new AppError("Notification not found.", 404);

    return toNotificationDTO(notification);
};

export const markAllNotificationsReadService = async ({ userId }) => {
    const { count } = await markAllNotificationsRead(userId, new Date());
    return { updated: count };
};
