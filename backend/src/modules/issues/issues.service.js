import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
import * as r from "./issues.repository.js";
import { issueDTO } from "./issues.dto.js";
const db = getPrisma();
const allowed = {
  LOADER: [
    "MISSING_ITEM",
    "DAMAGED_ITEM",
    "WRONG_ITEM",
    "QUANTITY_SHORT",
    "VEHICLE_PROBLEM",
    "OTHER",
  ],
  DRIVER: ["OUTLET_CLOSED", "VEHICLE_PROBLEM", "TRAFFIC_DELAY", "OTHER"],
  STORE_MANAGER: [
    "MISSING_ITEM",
    "DAMAGED_ITEM",
    "WRONG_ITEM",
    "QUANTITY_MISMATCH",
    "LATE_DELIVERY",
    "OTHER",
  ],
  DISPATCHER: [
    "MISSING_ITEM",
    "DAMAGED_ITEM",
    "WRONG_ITEM",
    "QUANTITY_MISMATCH",
    "QUANTITY_SHORT",
    "LATE_DELIVERY",
    "OUTLET_CLOSED",
    "VEHICLE_PROBLEM",
    "TRAFFIC_DELAY",
    "OTHER",
  ],
};
const itemTypes = [
  "MISSING_ITEM",
  "DAMAGED_ITEM",
  "WRONG_ITEM",
  "QUANTITY_MISMATCH",
  "QUANTITY_SHORT",
];
async function depots(uid) {
  return (
    await db.userDepot.findMany({
      where: { userId: uid },
      select: { depotId: true },
    })
  ).map((x) => x.depotId);
}
async function resolveTargets(input) {
  const [order, trip, stop, item] = await Promise.all([
    input.orderId
      ? db.order.findUnique({ where: { id: input.orderId } })
      : null,
    input.tripId
      ? db.trip.findUnique({
          where: { id: input.tripId },
          include: { plan: true },
        })
      : null,
    input.stopId
      ? db.stop.findUnique({
          where: { id: input.stopId },
          include: { trip: { include: { plan: true } }, allocations: true },
        })
      : null,
    input.orderItemId
      ? db.orderItem.findUnique({ where: { id: input.orderItemId } })
      : null,
  ]);
  if (
    (input.orderId && !order) ||
    (input.tripId && !trip) ||
    (input.stopId && !stop) ||
    (input.orderItemId && !item)
  )
    throw new AppError("TARGET_MISMATCH", 422);
  if (stop && trip && stop.tripId !== trip.id)
    throw new AppError("TARGET_MISMATCH", 422);
  if (stop && order && !stop.allocations.some((a) => a.orderId === order.id))
    throw new AppError("TARGET_MISMATCH", 422);
  if (item && order && item.orderId !== order.id)
    throw new AppError("TARGET_MISMATCH", 422);
  return {
    order,
    trip: trip ?? stop?.trip,
    stop,
    item,
    depotId: order?.depotId ?? trip?.plan.depotId ?? stop?.trip.plan.depotId,
  };
}
async function assertScope(user, t) {
  if (
    user.role === "STORE_MANAGER" &&
    (!t.order || t.order.outletId !== user.outletId)
  ) {
    const me = await db.user.findUnique({ where: { id: user.id } });
    if (!t.order || t.order.outletId !== me?.outletId)
      throw new AppError("OUT_OF_SCOPE", 403);
  }
  if (user.role === "DRIVER" && t.trip?.driverId !== user.id)
    throw new AppError("OUT_OF_SCOPE", 403);
  if (
    ["LOADER", "DISPATCHER"].includes(user.role) &&
    !(await depots(user.id)).includes(t.depotId)
  )
    throw new AppError("OUT_OF_SCOPE", 403);
}
async function notifyDispatchersTx(tx, depotId, issueId) {
  if (!depotId) return;
  const us = await tx.userDepot.findMany({
    where: {
      depotId,
      user: { role: "DISPATCHER", isActive: true, isApproved: true },
    },
    select: { userId: true },
  });
  if (us.length)
    await tx.notification.createMany({
      data: us.map((x) => ({
        userId: x.userId,
        type: "ISSUE_REPORTED",
        severity: "WARNING",
        title: "Operational issue reported",
        body: "A new issue needs review.",
        entityType: "Issue",
        entityId: issueId,
      })),
    });
}
export async function createIssue(user, input) {
  if (input.clientMutationId) {
    const old = await r.findIssueByClientMutationId(input.clientMutationId);
    if (old) {
      if (old.reportedById !== user.id)
        throw new AppError("clientMutationId already used", 409);
      return { statusCode: 200, data: issueDTO(old) };
    }
  }
  if (!allowed[user.role]?.includes(input.type))
    throw new AppError("TYPE_NOT_ALLOWED", 422);
  if (user.role === "STORE_MANAGER" && !input.description)
    throw new AppError("Description is required", 422);
  if (user.role === "DRIVER" && input.description?.length > 200)
    throw new AppError(
      "Driver description must be at most 200 characters",
      422,
    );
  if (
    itemTypes.includes(input.type) &&
    (!input.orderId ||
      !input.orderItemId ||
      input.expectedQty == null ||
      input.actualQty == null)
  )
    throw new AppError("Item issues require order, item and quantities", 422);
  if (
    ["QUANTITY_MISMATCH", "QUANTITY_SHORT"].includes(input.type) &&
    input.expectedQty === input.actualQty
  )
    throw new AppError(
      "Actual quantity must differ from expected quantity",
      422,
    );
  const t = await resolveTargets(input);
  await assertScope(user, t);
  if (input.photoFileIds.length) {
    const fs = await db.file.findMany({
      where: { id: { in: input.photoFileIds } },
    });
    if (
      fs.length !== input.photoFileIds.length ||
      fs.some((f) => f.kind !== "ISSUE_PHOTO" || f.uploadedById !== user.id)
    )
      throw new AppError("FILE_NOT_ATTACHABLE", 422);
  }
  const source = user.role;
  let made;
  await db.$transaction(async (tx) => {
    made = await tx.issue.create({
      data: {
        reference: await r.nextIssueReferenceTx(tx),
        source,
        type: input.type,
        orderId: input.orderId,
        tripId: input.tripId ?? t.trip?.id,
        stopId: input.stopId,
        orderItemId: input.orderItemId,
        expectedQty: input.expectedQty,
        actualQty: input.actualQty,
        description: input.description,
        reportedById: user.id,
        reportedAtDevice: input.reportedAtDevice,
        clientMutationId: input.clientMutationId,
        photos: { create: input.photoFileIds.map((fileId) => ({ fileId })) },
      },
    });
    await notifyDispatchersTx(tx, t.depotId, made.id);
  });
  return { statusCode: 201, data: issueDTO(await r.findIssue(made.id)) };
}
export async function createSystemIssueTx(
  tx,
  {
    type,
    orderId,
    tripId,
    stopId,
    depotId,
    description,
    reportedById,
    notify = true,
  },
) {
  if (!["LOADING_SHORTFALL", "SYNC_CONFLICT"].includes(type))
    throw new AppError("TYPE_NOT_ALLOWED", 422);
  const issue = await tx.issue.create({
    data: {
      reference: await r.nextIssueReferenceTx(tx),
      source: "SYSTEM",
      type,
      orderId,
      tripId,
      stopId,
      description,
      reportedById,
    },
  });
  if (notify) await notifyDispatchersTx(tx, depotId, issue.id);
  return issue;
}
async function visibleWhere(user) {
  if (user.role === "STORE_MANAGER") {
    const me = await db.user.findUnique({ where: { id: user.id } });
    return { order: { outletId: me?.outletId ?? "__none__" } };
  }
  if (user.role === "DISPATCHER") {
    const ds = await depots(user.id);
    return {
      OR: [
        { order: { depotId: { in: ds } } },
        { trip: { plan: { depotId: { in: ds } } } },
        { stop: { trip: { plan: { depotId: { in: ds } } } } },
      ],
    };
  }
  return { reportedById: user.id };
}
export async function listIssues(user, q) {
  const where = { ...(await visibleWhere(user)) };
  if (q.status) where.status = q.status;
  if (q.source) where.source = q.source;
  if (q.type) where.type = q.type;
  if (q.orderId) where.orderId = q.orderId;
  if (q.tripId) where.tripId = q.tripId;
  if (q.from || q.to)
    where.createdAt = {
      ...(q.from ? { gte: q.from } : {}),
      ...(q.to ? { lte: q.to } : {}),
    };
  const { items, total } = await r.listIssues(
    where,
    (q.page - 1) * q.pageSize,
    q.pageSize,
  );
  return {
    items: items.map(issueDTO),
    pagination: { page: q.page, pageSize: q.pageSize, total },
  };
}
export async function getIssue(user, id) {
  const i = await r.findIssue(id);
  if (!i) throw new AppError("Issue not found", 404);
  const visible = await db.issue.findFirst({
    where: { id, ...(await visibleWhere(user)) },
    select: { id: true },
  });
  if (!visible) throw new AppError("Issue not found", 404);
  return issueDTO(i);
}
export async function changeStatus(user, id, input) {
  const i = await r.findIssue(id);
  if (!i) throw new AppError("Issue not found", 404);
  const t = await resolveTargets({
    orderId: i.orderId,
    tripId: i.tripId,
    stopId: i.stopId,
  });
  if (!(await depots(user.id)).includes(t.depotId))
    throw new AppError("Issue not found", 404);
  const ok =
    (i.status === "OPEN" &&
      ["INVESTIGATING", "RESOLVED"].includes(input.status)) ||
    (i.status === "INVESTIGATING" && input.status === "RESOLVED");
  if (!ok) throw new AppError("INVALID_STATUS_TRANSITION", 409);
  await db.$transaction(async (tx) => {
    await tx.issue.update({
      where: { id },
      data: {
        status: input.status,
        resolutionNote: input.resolutionNote,
        resolvedById: input.status === "RESOLVED" ? user.id : null,
        resolvedAt: input.status === "RESOLVED" ? new Date() : null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "ISSUE_STATUS_CHANGED",
        entityType: "Issue",
        entityId: id,
        before: { status: i.status },
        after: { status: input.status },
      },
    });
    await tx.notification.create({
      data: {
        userId: i.reportedById,
        type: "ISSUE_STATUS_CHANGED",
        severity: "INFO",
        title: "Issue status updated",
        body: `${i.reference} is now ${input.status}.`,
        entityType: "Issue",
        entityId: id,
      },
    });
  });
  return issueDTO(await r.findIssue(id));
}
