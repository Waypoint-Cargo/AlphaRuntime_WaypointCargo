import { getPrisma } from "../../config/database.js";
const db = () => getPrisma();
export const include = {
  order: { include: { allocation: true } },
  outlet: true,
  decidedBy: { select: { id: true, fullName: true } },
  plan: true,
};
export const markServedTx = (tx, { orderId, planDate }) =>
  tx.deferral.updateMany({
    where: { orderId, toDate: planDate, status: "DEFERRED" },
    data: { status: "SERVED" },
  });
export async function revertServedTx(tx, { orderId, planDate }) {
  const r = await tx.deferral.updateMany({
    where: { orderId, toDate: planDate, status: "SERVED" },
    data: { status: "DEFERRED" },
  });
  return r.count > 0;
}
export const deletePendingForOrderTx = (tx, orderId) =>
  tx.deferral.deleteMany({ where: { orderId, status: "PENDING_DECISION" } });
export const countPendingForPlanTx = (tx, planId) =>
  tx.deferral.count({ where: { planId, status: "PENDING_DECISION" } });
export const find = (id) =>
  db().deferral.findUnique({ where: { id }, include });
export const pendingForOrder = (orderId) =>
  db().deferral.findFirst({
    where: { orderId, status: "PENDING_DECISION" },
    include,
  });
export const previousForOutlet = (outletId, fromDate) =>
  db().deferral.findFirst({
    where: { outletId, fromDate, status: { in: ["DEFERRED", "SERVED"] } },
    orderBy: { createdAt: "desc" },
  });
// Latest deferral an outlet received on `fromDate` (the previous operating day) - drives consecutiveCount and the
// "previously deferred" hint shown to the dispatcher.
export const findOutletDeferralOn = (client, outletId, fromDate) =>
  client.deferral.findFirst({
    where: { outletId, fromDate },
    orderBy: { createdAt: "desc" },
    select: { id: true, consecutiveCount: true, status: true },
  });
export const createDeferralsTx = (tx, deferrals) =>
  deferrals.length ? tx.deferral.createMany({ data: deferrals }) : { count: 0 };
// An order that gets allocated again is no longer waiting on a deferral decision.
export const markReplannedForOrderTx = (tx, orderId, decidedById) =>
  tx.deferral.updateMany({
    where: { orderId, status: { in: ["PENDING_DECISION", "DEFERRED"] } },
    data: { status: "REPLANNED", decidedById, decidedAt: new Date() },
  });
export async function list(where, skip, take) {
  const [items, total] = await Promise.all([
    db().deferral.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include,
    }),
    db().deferral.count({ where }),
  ]);
  return { items, total };
}
