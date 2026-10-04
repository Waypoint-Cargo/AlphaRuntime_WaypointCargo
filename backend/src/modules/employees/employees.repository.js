import { getPrisma } from "../../config/database.js";

const outletSelect = {
    id: true,
    code: true,
    name: true,
    brand: true,
    district: true,
};

const outletListSelect = {
    ...outletSelect,
    depot: { select: { id: true, code: true, name: true } },
};

const employeeSelect = {
    id: true,
    email: true,
    employeeNumber: true,
    fullName: true,
    phone: true,
    role: true,
    isActive: true,
    isApproved: true,
    approvedAt: true,
    createdAt: true,
    updatedAt: true,
    outlet: { select: outletSelect },
};

// find approved employees, optionally filtered by role/outlet/active status, paginated
export const findEmployees = async ({ role, outletId, isActive, skip, take }) => {
    const db = getPrisma();
    const where = {
        isApproved: true,
        ...(role ? { role } : {}),
        ...(outletId ? { outletId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
    };
    const [items, total] = await Promise.all([
        db.user.findMany({
            where,
            select: employeeSelect,
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        db.user.count({ where }),
    ]);
    return { items, total };
};

// find users awaiting store-manager approval, paginated
export const findPendingUsers = async ({ skip, take }) => {
    const db = getPrisma();
    const where = { isApproved: false, isActive: true };
    const [items, total] = await Promise.all([
        db.user.findMany({
            where,
            select: employeeSelect,
            orderBy: { createdAt: "asc" },
            skip,
            take,
        }),
        db.user.count({ where }),
    ]);
    return { items, total };
};

// find a single user by id with the fields needed to approve/delete them
export const findUserById = async (userId) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { id: userId },
        select: employeeSelect,
    });
};

// find an outlet by id (used to validate the outlet assigned on approval)
export const findOutletById = async (outletId) => {
    const db = getPrisma();
    return db.outlet.findUnique({
        where: { id: outletId },
        select: { ...outletSelect, isActive: true },
    });
};

// list active outlets for the approval picker, optionally filtered by brand/district
export const findOutlets = async ({ brand, district }) => {
    const db = getPrisma();
    return db.outlet.findMany({
        where: {
            isActive: true,
            ...(brand ? { brand } : {}),
            ...(district ? { district } : {}),
        },
        select: outletListSelect,
        orderBy: { code: "asc" },
    });
};

// employee numbers already issued for a role prefix (e.g. "dri_001"), used to pick the next one
export const findEmployeeNumbersByPrefix = async (prefix) => {
    const db = getPrisma();
    const rows = await db.user.findMany({
        where: { employeeNumber: { startsWith: `${prefix}_` } },
        select: { employeeNumber: true },
    });
    return rows.map((row) => row.employeeNumber);
};

// approve a pending user: assign employee number + outlet inside a transaction
export const approveUserTx = (tx, { userId, employeeNumber, outletId, approvedById }) => {
    return tx.user.update({
        where: { id: userId },
        data: {
            employeeNumber,
            outletId,
            isApproved: true,
            approvedAt: new Date(),
            approvedById,
        },
        select: employeeSelect,
    });
};

// permanently delete a user
export const deleteUser = async (userId) => {
    const db = getPrisma();
    return db.user.delete({ where: { id: userId } });
};
