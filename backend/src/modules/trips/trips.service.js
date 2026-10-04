import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
import * as repo from "./trips.repository.js";
import {
  tripSummaryDTO,
  tripDetailDTO,
  sequenceRequestDTO,
} from "./trips.dto.js";
const db = getPrisma();
const day = (s) => new Date(`${s}T00:00:00.000Z`);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
async function scope(user) {
  if (user.role === "DRIVER") return { driverId: user.id };
  const rows = await db.userDepot.findMany({
    where: { userId: user.id },
    select: { depotId: true },
  });
  return { depotIds: rows.map((x) => x.depotId) };
}
function assertScope(t, user, s) {
  if (user.role === "DRIVER" && t.driverId !== user.id)
    throw new AppError("OUT_OF_SCOPE", 403);
  if (
    ["DISPATCHER", "LOADER"].includes(user.role) &&
    !s.depotIds.includes(t.plan.depotId)
  )
    throw new AppError("OUT_OF_SCOPE", 403);
}
export async function listTrips(user, q) {
  const s = await scope(user),
    where = {};
  if (q.planId) where.planId = q.planId;
  if (q.deliveryDate) where.deliveryDate = day(q.deliveryDate);
  if (q.status) where.status = q.status;
  if (q.depotId) {
    if (!s.depotIds.includes(q.depotId))
      throw new AppError("OUT_OF_SCOPE", 403);
    where.plan = { depotId: q.depotId };
  } else where.plan = { depotId: { in: s.depotIds } };
  const { items, total } = await repo.listTrips(
    where,
    (q.page - 1) * q.pageSize,
    q.pageSize,
  );
  return {
    items: items.map(tripSummaryDTO),
    pagination: { page: q.page, pageSize: q.pageSize, total },
  };
}
export async function getTrip(user, id) {
  const t = await repo.getTrip(id);
  if (!t) throw new AppError("Trip not found", 404);
  assertScope(t, user, await scope(user));
  return tripDetailDTO(t);
}
export async function reorderStops(user, id, stopIds) {
  const t = await repo.getTrip(id);
  if (!t) throw new AppError("Trip not found", 404);
  assertScope(t, user, await scope(user));
  if (t.status !== "PLANNED") throw new AppError("TRIP_NOT_EDITABLE", 409);
  const old = t.stops.map((x) => x.id);
  if (old.length !== stopIds.length || old.some((x) => !stopIds.includes(x)))
    throw new AppError("INVALID_STOP_LIST", 422);
  await db.$transaction(async (tx) => {
    await repo.resequenceStopsTx(tx, id, stopIds);
    await repo.recomputeTripTotalsTx(tx, id);
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "STOP_SEQUENCE_CHANGED",
        entityType: "Trip",
        entityId: id,
        before: { stopIds: old },
        after: { stopIds },
      },
    });
  });
  return getTrip(user, id);
}
export async function changeDriver(user, id, driverId) {
  const t = await repo.getTrip(id);
  if (!t) throw new AppError("Trip not found", 404);
  assertScope(t, user, await scope(user));
  if (!["PLANNED", "LOADING", "LOADED"].includes(t.status))
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  const d = await db.user.findUnique({ where: { id: driverId } });
  if (!d || d.role !== "DRIVER" || !d.isActive || !d.isApproved)
    throw new AppError("INVALID_DRIVER", 422);
  const busy = await db.trip.findFirst({
    where: {
      driverId,
      deliveryDate: t.deliveryDate,
      tripNumber: t.tripNumber,
      vehicleId: { not: t.vehicleId },
      status: { not: "CANCELLED" },
    },
  });
  if (busy) throw new AppError("DRIVER_BUSY", 409);
  await db.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id },
      data: { driverId, version: { increment: 1 } },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "TRIP_DRIVER_CHANGED",
        entityType: "Trip",
        entityId: id,
        before: { driverId: t.driverId },
        after: { driverId },
      },
    });
  });
  return getTrip(user, id);
}
export async function requestSequenceChange(user, id, input) {
  const t = await repo.getTrip(id);
  if (!t) throw new AppError("Trip not found", 404);
  assertScope(t, user, await scope(user));
  if (!["LOADED", "IN_TRANSIT"].includes(t.status))
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  const pending = t.stops
    .filter((x) => x.status === "PENDING")
    .map((x) => x.id);
  if (
    pending.length !== input.proposedStopIds.length ||
    pending.some((x) => !input.proposedStopIds.includes(x))
  )
    throw new AppError("INVALID_STOP_LIST", 422);
  if (same(pending, input.proposedStopIds))
    throw new AppError("NO_CHANGE", 422);
  if (
    await db.sequenceChangeRequest.findFirst({
      where: { tripId: id, status: "PENDING" },
    })
  )
    throw new AppError("REQUEST_ALREADY_PENDING", 409);
  const r = await db.sequenceChangeRequest.create({
    data: {
      tripId: id,
      requestedById: user.id,
      proposedSequence: input.proposedStopIds,
      reason: input.reason,
    },
    include: { requestedBy: true, decidedBy: true },
  });
  return sequenceRequestDTO(r);
}
export async function listSequenceRequests(user, id) {
  const t = await repo.getTrip(id);
  if (!t) throw new AppError("Trip not found", 404);
  assertScope(t, user, await scope(user));
  return (
    await db.sequenceChangeRequest.findMany({
      where: { tripId: id },
      orderBy: { createdAt: "desc" },
      include: { requestedBy: true, decidedBy: true },
    })
  ).map(sequenceRequestDTO);
}
export async function decideSequenceRequest(user, requestId, decision) {
  const r = await db.sequenceChangeRequest.findUnique({
    where: { id: requestId },
    include: {
      trip: { include: repo.detailInclude },
      requestedBy: true,
      decidedBy: true,
    },
  });
  if (!r) throw new AppError("Request not found", 404);
  assertScope(r.trip, user, await scope(user));
  if (
    r.status !== "PENDING" ||
    !["LOADED", "IN_TRANSIT"].includes(r.trip.status)
  )
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  await db.$transaction(async (tx) => {
    if (decision === "APPROVED") {
      const pending = r.trip.stops
          .filter((x) => x.status === "PENDING")
          .map((x) => x.id),
        proposed = r.proposedSequence;
      if (
        pending.length !== proposed.length ||
        pending.some((x) => !proposed.includes(x))
      )
        throw new AppError("STALE_REQUEST", 409);
      const done = r.trip.stops
        .filter((x) => x.status !== "PENDING")
        .map((x) => x.id);
      await repo.resequenceStopsTx(tx, r.tripId, [...done, ...proposed]);
      await repo.recomputeTripTotalsTx(tx, r.tripId);
    }
    await tx.sequenceChangeRequest.update({
      where: { id: requestId },
      data: { status: decision, decidedById: user.id, decidedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "SEQUENCE_REQUEST_DECIDED",
        entityType: "SequenceChangeRequest",
        entityId: requestId,
        after: { decision },
      },
    });
  });
  return sequenceRequestDTO(
    await db.sequenceChangeRequest.findUnique({
      where: { id: requestId },
      include: { requestedBy: true, decidedBy: true },
    }),
  );
}
export { repo };
