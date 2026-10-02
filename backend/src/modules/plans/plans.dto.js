import { toYmd } from "../../utils/businessTime.js";

const toIso = (date) => (date ? date.toISOString() : null);

// order counts of the plan's depot and date, by what the dispatcher still has to do
export const toQueueCountsDTO = (countsByStatus) => ({
    confirmed: countsByStatus.CONFIRMED,
    deferred: countsByStatus.DEFERRED, // rolled into this date from an earlier one
    planned: countsByStatus.PLANNED,
    pendingReview: countsByStatus.PENDING_REVIEW, // missed confirmation: not planned
    unplanned: countsByStatus.CONFIRMED + countsByStatus.DEFERRED,
});

export const toPlanDTO = (plan, { queueCounts, trips } = {}) => ({
    id: plan.id,
    depot: { id: plan.depot.id, code: plan.depot.code, name: plan.depot.name },
    deliveryDate: toYmd(plan.deliveryDate),
    status: plan.status,
    closedAt: toIso(plan.closedAt),
    closedById: plan.closedById ?? null,
    publishedAt: toIso(plan.publishedAt),
    publishedById: plan.publishedById ?? null,
    version: plan.version,
    ...(queueCounts && { queueCounts: toQueueCountsDTO(queueCounts) }),
    ...(trips && { trips }),
});

export const toPlanListDTO = (items, { page, pageSize, total }) => ({
    items,
    pagination: { page, pageSize, total },
});

export const toPlanQueueDTO = ({ plan, orders, countsByStatus }) => {
    const counts = toQueueCountsDTO(countsByStatus);
    return {
        planId: plan.id,
        deliveryDate: toYmd(plan.deliveryDate),
        planStatus: plan.status,
        items: orders,
        counts: { unplanned: counts.unplanned, planned: counts.planned },
    };
};

export const toPublishResultDTO = (planDto, { trips, orders, sessions, itemChecks }) => ({
    plan: planDto,
    published: { trips, orders, loadingSessions: sessions, loadingItemChecks: itemChecks },
});
