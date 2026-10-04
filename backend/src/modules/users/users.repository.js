import { getPrisma } from "../../config/database.js";

const profileSelect = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    employeeNumber: true,
    role: true,
    isActive: true,
    isApproved: true,
    approvedAt: true,
    lastLoginAt: true,
    lockedUntil: true,
    createdAt: true,
    updatedAt: true,
    depots: {
        select: { depot: { select: { id: true, code: true, name: true } } },
    },
};

// find a user's full profile (own-account view) by id
export const findUserProfileById = async (userId) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { id: userId },
        select: profileSelect,
    });
};

// permanently delete a user's own account
export const deleteOwnAccount = async (userId) => {
    const db = getPrisma();
    return db.user.delete({ where: { id: userId } });
};
