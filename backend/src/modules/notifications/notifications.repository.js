// Manages database queries and status updates for user Notification records via Prisma.

export const createNotificationsTx = async (tx, notifications) => {
	if (!notifications.length) return { count: 0 };
	return tx.notification.createMany({ data: notifications });
};

// Active, approved users of a role, optionally restricted to depots (dispatcher/loader scope) or outlets (store managers).
export const findRecipientsTx = (tx, { role, depotIds, outletIds }) =>
	tx.user.findMany({
		where: {
			role,
			isActive: true,
			isApproved: true,
			...(depotIds ? { depots: { some: { depotId: { in: depotIds } } } } : {}),
			...(outletIds ? { outletId: { in: outletIds } } : {}),
		},
		select: { id: true, outletId: true },
	});
