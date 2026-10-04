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
