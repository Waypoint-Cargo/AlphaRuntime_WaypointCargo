import { AppError } from "../../utils/appError.js";
import { createAuditLog, createAuditLogTx, listAuditLogs } from "./audit.repository.js";
import { toAuditLogListDTO } from "./audit.dto.js";

// before/after must never hold credentials: any key that looks like a password, token,
// secret or hash is dropped. The JSON round trip also turns Dates/Decimals into plain JSON.
const SENSITIVE_KEY = /password|token|secret|hash/i;

const sanitize = (value) => {
    if (value === undefined || value === null) return undefined;
    return JSON.parse(JSON.stringify(value, (key, val) => (SENSITIVE_KEY.test(key) ? undefined : val)));
};

const toRow = ({ actorId, action, entityType, entityId, before, after, ip, requestId }) => {
    if (!action || !entityType) {
        throw new AppError("Audit entries need an action and an entityType.", 500, null, false);
    }
    return {
        actorId: actorId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        before: sanitize(before),
        after: sanitize(after),
        ip: ip ?? null,
        requestId: requestId ?? null,
    };
};

// Audit inside the caller's transaction, so the log row commits or rolls back with the change.
export const recordTx = async (tx, entry) => {
    await createAuditLogTx(tx, toRow(entry));
};

// Audit on its own (for events without a transaction).
export const record = async (entry) => {
    await createAuditLog(toRow(entry));
};

export const listAuditLogsService = async ({ entityType, entityId, actorId, action, from, to, page, pageSize }) => {
    const where = {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(actorId && { actorId }),
        ...(action && { action }),
        ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
    };

    const { rows, total } = await listAuditLogs({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toAuditLogListDTO(rows, { page, pageSize, total });
};
