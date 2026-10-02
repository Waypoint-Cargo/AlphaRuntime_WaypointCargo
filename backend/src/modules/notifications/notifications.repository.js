import { getPrisma } from "../../config/database.js";
import { Role } from "../../generated/prisma/index.js";

const notificationSelect = {
    id: true,
    type: true,
    severity: true,
    title: true,
    body: true,
    entityType: true,
    entityId: true,
    action: true,
    readAt: true,
    createdAt: true,
};

// insert many notification rows inside the caller's transaction
export const createNotificationsTx = (tx, rows) => {
    return tx.notification.createMany({ data: rows });
};

// page of one user's notifications (newest first) + total count for the same filter
export const listNotifications = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.notification.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take,
            select: notificationSelect,
        }),
        db.notification.count({ where }),
    ]);
    return { rows, total };
};

export const countUnreadNotifications = async (userId) => {
    const db = getPrisma();
    return db.notification.count({ where: { userId, readAt: null } });
};

// one notification, only if it belongs to the user
export const findUserNotification = async (id, userId) => {
    const db = getPrisma();
    return db.notification.findFirst({ where: { id, userId }, select: notificationSelect });
};

// mark one unread notification as read; returns { count } (0 when already read or not the user's)
export const markNotificationRead = async (id, userId, readAt) => {
    const db = getPrisma();
    return db.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt } });
};

export const markAllNotificationsRead = async (userId, readAt) => {
    const db = getPrisma();
    return db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt } });
};

// ---- recipient lookups: active + approved users only, ids only ----

const ACTIVE_APPROVED = { isActive: true, isApproved: true };

export const findStoreManagerIdsOfOutlet = async (outletId) => {
    const db = getPrisma();
    const users = await db.user.findMany({
        where: { ...ACTIVE_APPROVED, role: Role.STORE_MANAGER, outletId },
        select: { id: true },
    });
    return users.map((user) => user.id);
};

export const findUserIdsOfDepot = async (depotId, role) => {
    const db = getPrisma();
    const users = await db.user.findMany({
        where: { ...ACTIVE_APPROVED, role, depots: { some: { depotId } } },
        select: { id: true },
    });
    return users.map((user) => user.id);
};

export const findDriverIdsOfTrip = async (tripId) => {
    const db = getPrisma();
    const users = await db.user.findMany({
        where: { ...ACTIVE_APPROVED, tripsDriven: { some: { id: tripId } } },
        select: { id: true },
    });
    return users.map((user) => user.id);
};

// store managers of several outlets at once: Map(outletId -> userIds), active + approved only
export const findStoreManagerIdsOfOutlets = async (outletIds) => {
    const db = getPrisma();
    const users = await db.user.findMany({
        where: { ...ACTIVE_APPROVED, role: Role.STORE_MANAGER, outletId: { in: outletIds } },
        select: { id: true, outletId: true },
    });
    const byOutlet = new Map();
    for (const user of users) byOutlet.set(user.outletId, [...(byOutlet.get(user.outletId) ?? []), user.id]);
    return byOutlet;
};
