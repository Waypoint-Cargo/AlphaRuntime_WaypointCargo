import { getPrisma } from "../../config/database.js";

// Everything a profile or an admin view needs; credentials and token data are never selected.
const userDetailSelect = {
    id: true,
    username: true,
    email: true,
    employeeNumber: true,
    fullName: true,
    phone: true,
    role: true,
    avatarUrl: true,
    authProvider: true,
    isActive: true,
    isApproved: true,
    approvedAt: true,
    approvedById: true,
    lastLoginAt: true,
    lockedUntil: true,
    createdAt: true,
    updatedAt: true,
    outlet: { select: { id: true, code: true, name: true } },
    depots: { select: { depot: { select: { id: true, code: true, name: true } } } },
};

// role + outlet + depot ids, for scope checks
export const findUserScopeRow = async (userId) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            outletId: true,
            depots: { select: { depotId: true } },
        },
    });
};

export const findUserDetailById = async (id) => {
    const db = getPrisma();
    return db.user.findUnique({ where: { id }, select: userDetailSelect });
};

export const findUserDetailByIdTx = (tx, id) => {
    return tx.user.findUnique({ where: { id }, select: userDetailSelect });
};

// page of users + total count for the same filter (newest first)
export const listUsers = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.user.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take,
            select: userDetailSelect,
        }),
        db.user.count({ where }),
    ]);
    return { rows, total };
};

// existence checks for role assignment
export const findOutletById = async (id) => {
    const db = getPrisma();
    return db.outlet.findUnique({ where: { id }, select: { id: true } });
};

export const findDepotsByIds = async (ids) => {
    const db = getPrisma();
    return db.depot.findMany({ where: { id: { in: ids } }, select: { id: true } });
};

// set role / outlet (and, on approval, the approval fields) inside a transaction
export const updateUserAccessTx = (tx, id, data) => {
    return tx.user.update({ where: { id }, data, select: { id: true } });
};

// replace the user's depots with exactly this set
export const replaceUserDepotsTx = async (tx, userId, depotIds) => {
    await tx.userDepot.deleteMany({ where: { userId } });
    if (depotIds.length > 0) {
        await tx.userDepot.createMany({ data: depotIds.map((depotId) => ({ userId, depotId })) });
    }
};

export const updateUserStatusTx = (tx, id, isActive) => {
    return tx.user.update({ where: { id }, data: { isActive }, select: { id: true } });
};

// own-profile update; undefined fields are left alone, null clears phone / avatarUrl
export const updateUserProfile = async (id, data) => {
    const db = getPrisma();
    return db.user.update({ where: { id }, data, select: userDetailSelect });
};
