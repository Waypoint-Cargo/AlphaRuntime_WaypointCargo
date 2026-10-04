// Manages database persistence for LoadingSession and LoadingItemCheck models via Prisma.

// Creates the (empty) loading session of a trip with one PENDING check per order line. Called when a plan is published;
// LoadingSession.tripId is unique, so an existing session is kept untouched.
export const createSessionWithChecksTx = async (tx, { tripId, checks }) => {
	const existing = await tx.loadingSession.findUnique({ where: { tripId }, select: { id: true } });
	if (existing) return existing;
	return tx.loadingSession.create({
		data: {
			tripId,
			checks: { create: checks.map(({ orderItemId, plannedQty }) => ({ orderItemId, plannedQty })) },
		},
		select: { id: true, tripId: true },
	});
};
