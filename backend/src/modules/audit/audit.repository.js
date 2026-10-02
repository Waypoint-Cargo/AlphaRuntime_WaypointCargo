import { getPrisma } from "../../config/database.js";

const auditLogSelect = {
    id: true,
    actorId: true,
    action: true,
    entityType: true,
    entityId: true,
    before: true,
    after: true,
    ip: true,
    requestId: true,
    createdAt: true,
    actor: { select: { id: true, fullName: true, employeeNumber: true, role: true } },
};

// write one audit row
export const createAuditLog = async (data) => {
    const db = getPrisma();
    return db.auditLog.create({ data, select: { id: true } });
};

// write one audit row inside a transaction
export const createAuditLogTx = (tx, data) => {
    return tx.auditLog.create({ data, select: { id: true } });
};

// page of audit rows (newest first) + total count for the same filter
export const listAuditLogs = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.auditLog.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take,
            select: auditLogSelect,
        }),
        db.auditLog.count({ where }),
    ]);
    return { rows, total };
};
