// Shapes an audit row for the client (before/after were already stripped of secrets on write).
export const toAuditLogDTO = (row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ?? null,
    actor: row.actor
        ? {
              id: row.actor.id,
              fullName: row.actor.fullName,
              employeeNumber: row.actor.employeeNumber,
              role: row.actor.role,
          }
        : null,
    before: row.before ?? null,
    after: row.after ?? null,
    ip: row.ip ?? null,
    requestId: row.requestId ?? null,
    createdAt: row.createdAt,
});

export const toAuditLogListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toAuditLogDTO),
    pagination: { page, pageSize, total },
});
