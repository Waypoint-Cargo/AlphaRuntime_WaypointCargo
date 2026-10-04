import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
import * as r from "./deferrals.repository.js";
import { deferralDTO, reasonText } from "./deferrals.dto.js";
const db = getPrisma();
const day = (s) => new Date(`${s}T00:00:00.000Z`),
  ymd = (d) => new Date(d).toISOString().slice(0, 10);
async function depots(uid) {
  return (
    await db.userDepot.findMany({
      where: { userId: uid },
      select: { depotId: true },
    })
  ).map((x) => x.depotId);
}
async function nextOperating(d, dir = 1) {
  const x = await db.calendarDay.findFirst({
    where: { date: { [dir > 0 ? "gt" : "lt"]: d }, isOperatingDay: true },
    orderBy: { date: dir > 0 ? "asc" : "desc" },
  });
  return x?.date ?? null;
}
async function orderScoped(uid, id) {
  const o = await db.order.findUnique({
    where: { id },
    include: { outlet: true, allocation: { include: { stop: true } } },
  });
  if (!o) throw new AppError("Order not found", 404);
  if (!(await depots(uid)).includes(o.depotId))
    throw new AppError("OUT_OF_SCOPE", 403);
  return o;
}
async function planFor(o) {
  return db.dispatchPlan.findUnique({
    where: {
      depotId_deliveryDate: {
        depotId: o.depotId,
        deliveryDate: o.deliveryDate,
      },
    },
  });
}
async function notifyTx(tx, outletId, type, title, body, entityId) {
  const users = await tx.user.findMany({
    where: {
      outletId,
      role: "STORE_MANAGER",
      isActive: true,
      isApproved: true,
    },
    select: { id: true },
  });
  if (users.length)
    await tx.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type,
        severity: "INFO",
        title,
        body,
        entityType: "Deferral",
        entityId,
      })),
    });
}
async function transitionOrderTx(tx, o, to, reason) {
  await tx.order.update({
    where: { id: o.id },
    data: { status: to, version: { increment: 1 } },
  });
  await tx.orderEvent.create({
    data: { orderId: o.id, fromStatus: o.status, toStatus: to, reason },
  });
}
async function createCore(user, o, plan, reason, note, existingId) {
  const prevDate = await nextOperating(o.deliveryDate, -1),
    prev = prevDate ? await r.previousForOutlet(o.outletId, prevDate) : null,
    count = prev ? prev.consecutiveCount + 1 : 1;
  const to = reason ? await nextOperating(o.deliveryDate, 1) : null;
  if (reason && !to) throw new AppError("NO_NEXT_OPERATING_DAY", 422);
  return db.$transaction(async (tx) => {
    if (o.status === "PLANNED" && o.allocation) {
      await tx.allocation.delete({ where: { orderId: o.id } });
    }
    const data = {
      orderId: o.id,
      outletId: o.outletId,
      planId: plan.id,
      fromDate: o.deliveryDate,
      toDate: to,
      status: reason ? "DEFERRED" : "PENDING_DECISION",
      reason: reason ?? null,
      note: note ?? null,
      detectedConflicts: [],
      consecutiveCount: count,
      decidedById: reason ? user.id : null,
      decidedAt: reason ? new Date() : null,
    };
    const d = existingId
      ? await tx.deferral.update({ where: { id: existingId }, data })
      : await tx.deferral.create({ data });
    if (reason) {
      await tx.order.update({
        where: { id: o.id },
        data: {
          deliveryDate: to,
          rolledOver: true,
          status: "DEFERRED",
          version: { increment: 1 },
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: o.id,
          fromStatus: o.status,
          toStatus: "DEFERRED",
          actorId: user.id,
          reason,
        },
      });
      await notifyTx(
        tx,
        o.outletId,
        "ORDER_DEFERRED",
        "Delivery rescheduled",
        `${reasonText(reason)} New delivery date: ${ymd(to)}.`,
        d.id,
      );
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: existingId ? "DEFERRAL_DECIDED" : "ORDER_DEFERRED",
        entityType: "Deferral",
        entityId: d.id,
        after: { reason, toDate: to ? ymd(to) : null },
      },
    });
    return d;
  });
}
export async function deferOrder(user, input) {
  const o = await orderScoped(user.id, input.orderId),
    p = await planFor(o);
  if (!p) throw new AppError("PLAN_NOT_CLOSED", 409);
  if (
    p.status === "PUBLISHED" ||
    p.status === "IN_EXECUTION" ||
    p.status === "COMPLETED"
  )
    throw new AppError("PLAN_PUBLISHED", 409);
  if (!["CLOSED", "DRAFT"].includes(p.status))
    throw new AppError("PLAN_NOT_CLOSED", 409);
  if (!["CONFIRMED", "PLANNED", "DEFERRED"].includes(o.status))
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  if (await r.pendingForOrder(o.id)) throw new AppError("ALREADY_PENDING", 409);
  const d = await createCore(user, o, p, input.reason, input.note);
  return deferralDTO(await r.find(d.id));
}
export async function listDeferrals(user, q) {
  const ds = await depots(user.id);
  if (q.depotId && !ds.includes(q.depotId))
    throw new AppError("OUT_OF_SCOPE", 403);
  const where = { order: { depotId: q.depotId ?? { in: ds } } };
  if (q.date) where.fromDate = day(q.date);
  if (q.brand) where.order = { ...where.order, brand: q.brand };
  if (q.status) where.status = q.status;
  if (q.q)
    where.OR = [
      { order: { reference: { contains: q.q, mode: "insensitive" } } },
      { outlet: { name: { contains: q.q, mode: "insensitive" } } },
    ];
  const { items, total } = await r.list(
    where,
    (q.page - 1) * q.pageSize,
    q.pageSize,
  );
  return {
    items: items.map(deferralDTO),
    pagination: { page: q.page, pageSize: q.pageSize, total },
  };
}
export async function summary(user, q) {
  const ds = await depots(user.id);
  if (q.depotId && !ds.includes(q.depotId))
    throw new AppError("OUT_OF_SCOPE", 403);
  const d = q.date ? day(q.date) : day(new Date().toISOString().slice(0, 10)),
    scope = { order: { depotId: q.depotId ?? { in: ds } }, fromDate: d };
  const seven = new Date(d);
  seven.setUTCDate(seven.getUTCDate() - 7);
  const [deferredToday, pendingDecision, previouslyDeferred7d, repeatOutlets] =
    await Promise.all([
      db.deferral.count({ where: { ...scope, status: "DEFERRED" } }),
      db.deferral.count({ where: { ...scope, status: "PENDING_DECISION" } }),
      db.deferral.count({
        where: {
          order: scope.order,
          fromDate: { gte: seven, lt: d },
          status: { in: ["DEFERRED", "SERVED"] },
        },
      }),
      db.deferral.findMany({
        where: {
          order: scope.order,
          fromDate: { gte: seven, lte: d },
          consecutiveCount: { gte: 2 },
        },
        distinct: ["outletId"],
        select: { outletId: true },
      }),
    ]);
  return {
    deferredToday,
    pendingDecision,
    previouslyDeferred7d,
    repeatOutlets: repeatOutlets.length,
  };
}
export async function history(user, outletId, limit = 20) {
  const outlet = await db.outlet.findUnique({ where: { id: outletId } });
  if (!outlet) throw new AppError("Outlet not found", 404);
  if (!(await depots(user.id)).includes(outlet.depotId))
    throw new AppError("OUT_OF_SCOPE", 403);
  const items = await db.deferral.findMany({
    where: { outletId },
    take: limit,
    orderBy: { fromDate: "desc" },
    include: r.include,
  });
  return {
    outlet: {
      id: outlet.id,
      code: outlet.code,
      name: outlet.name,
      district: outlet.district,
    },
    currentStreak: items[0]?.consecutiveCount ?? 0,
    items: items.map(deferralDTO),
  };
}
export async function get(user, id) {
  const d = await r.find(id);
  if (!d) throw new AppError("Deferral not found", 404);
  if (!(await depots(user.id)).includes(d.order.depotId))
    throw new AppError("OUT_OF_SCOPE", 403);
  return {
    ...deferralDTO(d),
    outletHistory: (
      await db.deferral.findMany({
        where: { outletId: d.outletId },
        take: 10,
        orderBy: { fromDate: "desc" },
        include: r.include,
      })
    ).map(deferralDTO),
  };
}
export async function decide(user, id, input) {
  const d = await r.find(id);
  if (!d) throw new AppError("Deferral not found", 404);
  if (d.status !== "PENDING_DECISION")
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  const o = await orderScoped(user.id, d.orderId),
    p = d.plan;
  if (!p || !["CLOSED", "DRAFT"].includes(p.status))
    throw new AppError("PLAN_PUBLISHED", 409);
  if (o.status !== "CONFIRMED")
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  await createCore(user, o, p, input.reason, input.note, id);
  return deferralDTO(await r.find(id));
}
export async function replan(user, id) {
  const d = await r.find(id);
  if (!d) throw new AppError("Deferral not found", 404);
  await orderScoped(user.id, d.orderId);
  if (d.status !== "DEFERRED")
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  if (!d.plan || !["CLOSED", "DRAFT"].includes(d.plan.status))
    throw new AppError("PLAN_PUBLISHED", 409);
  if (
    d.order.status !== "DEFERRED" ||
    ymd(d.order.deliveryDate) !== ymd(d.toDate) ||
    d.order.allocation
  )
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  await db.$transaction(async (tx) => {
    await tx.deferral.update({ where: { id }, data: { status: "REPLANNED" } });
    await tx.order.update({
      where: { id: d.orderId },
      data: {
        deliveryDate: d.fromDate,
        rolledOver: false,
        status: "CONFIRMED",
        version: { increment: 1 },
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: d.orderId,
        fromStatus: "DEFERRED",
        toStatus: "CONFIRMED",
        actorId: user.id,
        reason: "Replanned",
      },
    });
    await notifyTx(
      tx,
      d.outletId,
      "ORDER_BACK_IN_PLANNING",
      "Order back in planning",
      "Your order has been returned to its original delivery run.",
      id,
    );
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "DEFERRAL_REPLANNED",
        entityType: "Deferral",
        entityId: id,
      },
    });
  });
  return deferralDTO(await r.find(id));
}
