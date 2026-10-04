// Manages database queries and mutations for the Deferral model and historical skip counts via Prisma.

// Latest deferral an outlet received on `fromDate` (the previous operating day) - drives consecutiveCount and the
// "previously deferred" hint shown to the dispatcher.
export const findOutletDeferralOn = (client, outletId, fromDate) =>
	client.deferral.findFirst({
		where: { outletId, fromDate },
		orderBy: { createdAt: "desc" },
		select: { id: true, consecutiveCount: true, status: true },
	});

export const createDeferralsTx = (tx, deferrals) => (deferrals.length ? tx.deferral.createMany({ data: deferrals }) : { count: 0 });

// An order that gets allocated again is no longer waiting on a deferral decision.
export const markReplannedForOrderTx = (tx, orderId, decidedById) =>
	tx.deferral.updateMany({
		where: { orderId, status: { in: ["PENDING_DECISION", "DEFERRED"] } },
		data: { status: "REPLANNED", decidedById, decidedAt: new Date() },
	});
