// Shared writer for the append-only AuditLog table. Always call inside the same transaction as the change it records.

// Json columns reject Date/Decimal instances, so snapshots are normalised to plain JSON first.
const toJson = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

export const createAuditLogTx = (tx, { actorId = null, action, entityType, entityId = null, before, after, ip, requestId }) =>
	tx.auditLog.create({
		data: {
			actorId,
			action,
			entityType,
			entityId,
			...(before !== undefined ? { before: toJson(before) } : {}),
			...(after !== undefined ? { after: toJson(after) } : {}),
			ip: ip ?? null,
			requestId: requestId ?? null,
		},
	});
