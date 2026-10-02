import { Role } from "../../generated/prisma/index.js";
import { toYmd } from "../../utils/businessTime.js";
import { toNumber, toWindowDTO } from "../../utils/serialize.js";

const toIso = (date) => (date ? date.toISOString() : null);

export const toOrderSummaryDTO = (order) => ({
    id: order.id,
    reference: order.reference,
    outlet: { id: order.outlet.id, code: order.outlet.code, name: order.outlet.name },
    depotId: order.depotId,
    brand: order.brand,
    tempClass: order.tempClass,
    requestedDeliveryDate: toYmd(order.requestedDeliveryDate),
    deliveryDate: toYmd(order.deliveryDate),
    rolledOver: order.rolledOver,
    status: order.status,
    totalWeightKg: toNumber(order.totalWeightKg),
    totalVolumeM3: toNumber(order.totalVolumeM3),
    itemCount: order.itemCount,
    isFragile: order.isFragile,
    isHighValue: order.isHighValue,
    cutoffAt: toIso(order.cutoffAt),
    submittedAt: toIso(order.submittedAt),
    confirmedAt: toIso(order.confirmedAt),
    cancelledAt: toIso(order.cancelledAt),
    version: order.version,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
});

export const toOrderListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toOrderSummaryDTO),
    pagination: { page, pageSize, total },
});

const toItemDTO = (item) => ({
    id: item.id,
    lineNo: item.lineNo,
    itemName: item.itemName,
    sku: item.sku ?? null,
    unit: item.unit,
    quantity: item.quantity,
    weightKg: toNumber(item.weightKg),
    volumeM3: toNumber(item.volumeM3),
    notes: item.notes ?? null,
});

const toTimelineEntryDTO = (event) => ({
    id: event.id,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus,
    reason: event.reason ?? null,
    data: event.data ?? null,
    occurredAt: toIso(event.occurredAt),
    actor: event.actor ? { id: event.actor.id, fullName: event.actor.fullName } : null,
});

const toAllocationDTO = (allocation) =>
    allocation
        ? {
              tripId: allocation.stop.trip.id,
              tripCode: allocation.stop.trip.code,
              tripNumber: allocation.stop.trip.tripNumber,
              tripStatus: allocation.stop.trip.status,
              vehicleCode: allocation.stop.trip.vehicle.code,
              stopSequence: allocation.stop.sequence,
              predictedArrival: toIso(allocation.stop.predictedArrival),
              allocatedAt: toIso(allocation.allocatedAt),
          }
        : null;

// store managers see the reason in plain words and never the dispatcher's internal note
// (labelFor comes from the notifications module: labelFor(reason, "dispatcher" | "storeManager"))
const toDeferralDTO = (deferral, audience, labelFor) =>
    deferral
        ? {
              id: deferral.id,
              status: deferral.status,
              reason: deferral.reason ?? null,
              reasonLabel: labelFor(deferral.reason, audience === Role.STORE_MANAGER ? "storeManager" : "dispatcher"),
              ...(audience !== Role.STORE_MANAGER && { note: deferral.note ?? null }),
              fromDate: toYmd(deferral.fromDate),
              toDate: deferral.toDate ? toYmd(deferral.toDate) : null,
              decidedAt: toIso(deferral.decidedAt),
          }
        : null;

// audience: the viewer's Role
export const toOrderDetailDTO = (order, audience, labelFor) => ({
    ...toOrderSummaryDTO(order),
    specialInstructions: order.specialInstructions ?? null,
    outletRequirements: {
        vanOnly: order.vanOnly ?? null,
        isMall: order.isMall ?? null,
        unloadingType: order.unloadingType ?? null,
        window: toWindowDTO(order.windowStartMin, order.windowEndMin),
    },
    items: order.items.map(toItemDTO),
    timeline: order.events.map(toTimelineEntryDTO),
    allocation: toAllocationDTO(order.allocation),
    latestDeferral: toDeferralDTO(order.deferrals[0], audience, labelFor),
    receipt: order.receipt ? { status: order.receipt.status, confirmedAt: toIso(order.receipt.confirmedAt) } : null,
});

// plain shape for the allocation engine (other modules)
export const toOrderPlanningDTO = (order) => ({
    id: order.id,
    reference: order.reference,
    outletId: order.outletId,
    depotId: order.depotId,
    status: order.status,
    requestedDeliveryDate: toYmd(order.requestedDeliveryDate),
    deliveryDate: toYmd(order.deliveryDate),
    tempClass: order.tempClass,
    weightKg: toNumber(order.totalWeightKg),
    volumeM3: toNumber(order.totalVolumeM3),
    vanOnly: order.vanOnly ?? null,
    isMall: order.isMall ?? null,
    window: toWindowDTO(order.windowStartMin, order.windowEndMin),
    isAllocated: Boolean(order.allocation),
});

// one row of a plan's queue; `siblings` are the other orders of the same outlet for the date
export const toQueueOrderDTO = (order, siblings) => ({
    id: order.id,
    reference: order.reference,
    status: order.status,
    brand: order.brand,
    tempClass: order.tempClass,
    deliveryDate: toYmd(order.deliveryDate),
    requestedDeliveryDate: toYmd(order.requestedDeliveryDate),
    rolledOver: order.rolledOver,
    weightKg: toNumber(order.totalWeightKg),
    volumeM3: toNumber(order.totalVolumeM3),
    itemCount: order.itemCount,
    isFragile: order.isFragile,
    isHighValue: order.isHighValue,
    specialInstructions: order.specialInstructions ?? null,
    outlet: {
        id: order.outlet.id,
        code: order.outlet.code,
        name: order.outlet.name,
        district: order.outlet.district,
        vanOnly: order.outlet.vanOnly,
        isMall: order.outlet.isMall,
        window: toWindowDTO(order.outlet.windowStartMin, order.outlet.windowEndMin),
        mallAccessWindow: toWindowDTO(order.outlet.mallAccessStartMin, order.outlet.mallAccessEndMin),
        unloadingType: order.outlet.unloadingType ?? null,
    },
    siblingOrders: siblings.map((sibling) => ({
        id: sibling.id,
        reference: sibling.reference,
        tempClass: sibling.tempClass,
        status: sibling.status,
    })),
    allocation: order.allocation
        ? {
              tripId: order.allocation.stop.trip.id,
              tripCode: order.allocation.stop.trip.code,
              tripNumber: order.allocation.stop.trip.tripNumber,
              vehicleCode: order.allocation.stop.trip.vehicle.code,
              stopSequence: order.allocation.stop.sequence,
              predictedArrival: toIso(order.allocation.stop.predictedArrival),
          }
        : null,
});

export const toOrderCountsDTO = ({ deliveryDate, byStatus, byBrand }) => ({
    deliveryDate: deliveryDate ?? null,
    total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    byStatus,
    byBrand,
});

export const toOrderChecksDTO = (checks) => ({
    checks,
    canConfirm: checks.every((check) => check.status !== "FAIL"),
});

// result of POST /orders/:id/confirm: the order plus what happened to its date
export const toOrderConfirmationDTO = (order, { rolledOver, previousDeliveryDate }) => ({
    order,
    confirmation: {
        deliveryDate: order.deliveryDate,
        rolledOver,
        previousDeliveryDate: rolledOver ? previousDeliveryDate : null,
    },
});

// ---- prompt 3 ----

// the facts other modules need about one order: owner outlet and depot, lines, where it is allocated
export const toOrderRefDTO = (order) => ({
    id: order.id,
    reference: order.reference,
    outletId: order.outletId,
    depotId: order.depotId,
    status: order.status,
    deliveryDate: toYmd(order.deliveryDate),
    items: order.items.map((item) => ({
        id: item.id,
        lineNo: item.lineNo,
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
    })),
    stopId: order.allocation?.stopId ?? null,
    tripId: order.allocation?.stop.tripId ?? null,
    driverId: order.allocation?.stop.trip.driverId ?? null,
    receipt: order.receipt ? { status: order.receipt.status, confirmedAt: order.receipt.confirmedAt } : null,
});
