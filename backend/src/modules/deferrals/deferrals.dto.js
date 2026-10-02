import { toYmd } from "../../utils/businessTime.js";
import { toNumber } from "../../utils/serialize.js";

const toIso = (date) => (date ? date.toISOString() : null);

// labelFor comes from the notifications module: labelFor(reason, "dispatcher" | "storeManager")
export const toDeferralDTO = (deferral, labelFor) => ({
    id: deferral.id,
    status: deferral.status,
    reason: deferral.reason ?? null,
    reasonLabel: labelFor(deferral.reason, "dispatcher"),
    note: deferral.note ?? null,
    fromDate: toYmd(deferral.fromDate),
    toDate: deferral.toDate ? toYmd(deferral.toDate) : null,
    consecutiveCount: deferral.consecutiveCount,
    detectedConflicts: deferral.detectedConflicts,
    planId: deferral.planId ?? null,
    order: {
        id: deferral.order.id,
        reference: deferral.order.reference,
        status: deferral.order.status,
        tempClass: deferral.order.tempClass,
        brand: deferral.order.brand,
        weightKg: toNumber(deferral.order.totalWeightKg),
        volumeM3: toNumber(deferral.order.totalVolumeM3),
        deliveryDate: toYmd(deferral.order.deliveryDate),
        requestedDeliveryDate: toYmd(deferral.order.requestedDeliveryDate),
    },
    outlet: {
        id: deferral.outlet.id,
        code: deferral.outlet.code,
        name: deferral.outlet.name,
        brand: deferral.outlet.brand,
        district: deferral.outlet.district,
    },
    decidedBy: deferral.decidedBy ? { id: deferral.decidedBy.id, fullName: deferral.decidedBy.fullName } : null,
    decidedAt: toIso(deferral.decidedAt),
    createdAt: toIso(deferral.createdAt),
});

export const toDeferralListDTO = (rows, { page, pageSize, total }, labelFor) => ({
    items: rows.map((row) => toDeferralDTO(row, labelFor)),
    pagination: { page, pageSize, total },
});

// detail view: the deferral plus the outlet's most recent deferrals
export const toDeferralDetailDTO = (deferral, recent, labelFor) => ({
    ...toDeferralDTO(deferral, labelFor),
    outletHistory: recent.map((row) => toDeferralDTO(row, labelFor)),
});

export const toDeferralSummaryDTO = ({ date, deferredToday, pendingDecisions, deferredLast7Days }) => ({
    date,
    deferredToday,
    pendingDecisions,
    deferredLast7Days,
});
