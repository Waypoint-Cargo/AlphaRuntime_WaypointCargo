import crypto from "crypto";
import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
import { transitionTripTx } from "../trips/trips.repository.js";
import * as repo from "./deliveries.repository.js";
import { stopStateDTO, proofDTO, num } from "./deliveries.dto.js";
const db = getPrisma();
const day = (s) => new Date(`${s}T00:00:00.000Z`);
const corrected = (d, o = 0) => new Date(new Date(d).getTime() + o);
const terminal = ["COMPLETED", "PARTIAL", "FAILED", "SKIPPED"];
// "Today" is the Asia/Colombo calendar date, the same day the loader app works on.
const colomboToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(
    new Date(),
  );
// A trip becomes a driver task once the loader has finished it (status LOADED). The plan may still be a draft:
// loaders work on allocated routes without waiting for the dispatcher to publish.
const TASK_PLAN_STATUSES = ["CLOSED", "DRAFT", "PUBLISHED", "IN_EXECUTION"];
const MY_PLAN_STATUSES = [...TASK_PLAN_STATUSES, "COMPLETED"];
async function notifyOutletTx(
  tx,
  outletId,
  type,
  title,
  body,
  entityId,
  action,
) {
  const us = await tx.user.findMany({
    where: {
      outletId,
      role: "STORE_MANAGER",
      isActive: true,
      isApproved: true,
    },
    select: { id: true },
  });
  if (us.length)
    await tx.notification.createMany({
      data: us.map((u) => ({
        userId: u.id,
        type,
        severity: "INFO",
        title,
        body,
        entityType: "Stop",
        entityId,
        action,
      })),
    });
}
async function notifyDispatchersTx(tx, depotId, type, title, body, entityId) {
  const us = await tx.userDepot.findMany({
    where: {
      depotId,
      user: { role: "DISPATCHER", isActive: true, isApproved: true },
    },
    select: { userId: true },
  });
  if (us.length)
    await tx.notification.createMany({
      data: us.map((u) => ({
        userId: u.userId,
        type,
        severity: "WARNING",
        title,
        body,
        entityType: "Stop",
        entityId,
      })),
    });
}
async function finishTripIfDoneTx(tx, trip) {
  if (await repo.countUnfinishedStops(tx, trip.id)) return;
  await transitionTripTx(tx, {
    tripId: trip.id,
    toStatus: "COMPLETED",
    data: { actualReturn: new Date() },
  });
  const remaining = await tx.trip.count({
    where: {
      planId: trip.planId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  });
  if (!remaining)
    await tx.dispatchPlan.updateMany({
      where: { id: trip.planId, status: { in: ["PUBLISHED", "IN_EXECUTION"] } },
      data: { status: "COMPLETED", version: { increment: 1 } },
    });
}
function bundleTrip(t) {
  return {
    id: t.id,
    code: t.code,
    tripNumber: t.tripNumber,
    status: t.status,
    actualDeparture: t.actualDeparture,
    plannedDistanceKm: num(t.plannedDistanceKm),
    vehicle: {
      id: t.vehicle.id,
      code: t.vehicle.code,
      type: t.vehicle.type,
      isRefrigerated: t.vehicle.isRefrigerated,
      maxWeightKg: num(t.vehicle.maxWeightKg),
      maxVolumeM3: num(t.vehicle.maxVolumeM3),
    },
    depot: {
      code: t.plan.depot.code,
      name: t.plan.depot.name,
      lat: num(t.plan.depot.lat),
      lng: num(t.plan.depot.lng),
    },
    stops: t.stops.map((s) => ({
      id: s.id,
      sequence: s.sequence,
      status: s.status,
      predictedArrival: s.predictedArrival,
      arrivedAt: s.arrivedAt,
      unloadingStartedAt: s.unloadingStartedAt,
      completedAt: s.completedAt,
      failureReason: s.failureReason,
      hasProof: !!s.proof,
      outlet: {
        id: s.outlet.id,
        code: s.outlet.code,
        name: s.outlet.name,
        district: s.outlet.district,
        address: s.outlet.address,
        lat: num(s.outlet.lat),
        lng: num(s.outlet.lng),
        phone: s.outlet.phone,
        effectiveWindow: {
          startMin: s.outlet.windowStartMin,
          endMin: s.outlet.windowEndMin,
        },
        unloadingType: s.outlet.unloadingType,
        unloadingNotes: s.outlet.unloadingNotes,
        vanOnly: s.outlet.vanOnly,
      },
      orders: s.allocations.map((a) => ({
        id: a.order.id,
        reference: a.order.reference,
        tempClass: a.order.tempClass,
        isFragile: a.order.isFragile,
        isHighValue: a.order.isHighValue,
        specialInstructions: a.order.specialInstructions,
        totalWeightKg: num(a.order.totalWeightKg),
        totalVolumeM3: num(a.order.totalVolumeM3),
        items: a.order.items.map((i) => {
          const chk =
            i.loadingChecks.find((x) => x.session?.tripId === t.id) ||
            i.loadingChecks[0];
          return {
            id: i.id,
            lineNo: i.lineNo,
            itemName: i.itemName,
            unit: i.unit,
            quantity: i.quantity,
            loadedQty: chk?.loadedQty ?? i.quantity,
          };
        }),
      })),
      totals: {
        units: s.allocations
          .flatMap((a) => a.order.items)
          .reduce((x, i) => x + i.quantity, 0),
        weightKg: s.allocations.reduce(
          (x, a) => x + num(a.order.totalWeightKg),
          0,
        ),
        volumeM3: s.allocations.reduce(
          (x, a) => x + num(a.order.totalVolumeM3),
          0,
        ),
      },
    })),
  };
}
const tripInclude = {
  vehicle: true,
  plan: { include: { depot: true } },
  stops: {
    orderBy: { sequence: "asc" },
    include: {
      outlet: true,
      proof: true,
      allocations: {
        include: {
          order: {
            include: {
              items: {
                include: { loadingChecks: { include: { session: true } } },
              },
            },
          },
        },
      },
    },
  },
};
// The driver's own trips: the given day exactly, or (no date) today's plus any trip still to be driven.
async function trips(user, date) {
  return db.trip.findMany({
    where: {
      driverId: user.id,
      ...(date
        ? { deliveryDate: date }
        : {
            OR: [
              { deliveryDate: day(colomboToday()) },
              { status: { in: ["LOADED", "IN_TRANSIT"] } },
            ],
          }),
      plan: { status: { in: MY_PLAN_STATUSES } },
    },
    orderBy: { tripNumber: "asc" },
    include: tripInclude,
  });
}
// Tasks a driver can pick: trips the loader has finished that nobody has taken yet. A driver who works at
// specific depots only sees those; one without any depot sees every depot (approved drivers get no depot row).
async function availableWhere(user, date) {
  const depots = (
    await db.userDepot.findMany({
      where: { userId: user.id },
      select: { depotId: true },
    })
  ).map((x) => x.depotId);
  return {
    driverId: null,
    status: "LOADED",
    ...(date ? { deliveryDate: date } : {}),
    plan: {
      status: { in: TASK_PLAN_STATUSES },
      ...(depots.length ? { depotId: { in: depots } } : {}),
    },
  };
}
export async function getAvailable(user, q) {
  const ts = await db.trip.findMany({
    where: await availableWhere(user, q.date ? day(q.date) : null),
    orderBy: [{ deliveryDate: "asc" }, { tripNumber: "asc" }, { code: "asc" }],
    include: tripInclude,
  });
  return {
    date: q.date ?? colomboToday(),
    generatedAt: new Date(),
    trips: ts.map(bundleTrip),
  };
}
// A driver takes an available task. The conditional update makes sure only one driver wins.
export async function selectTask(user, tripId) {
  const t = await db.trip.findUnique({ where: { id: tripId } });
  if (!t) throw new AppError("Trip not found", 404);
  if (t.driverId === user.id) return { trip: await loadBundle(tripId) };
  const gone = (code, message) => new AppError(message, 409, { code });
  if (t.driverId)
    throw gone("TASK_TAKEN", "Another driver has already taken this task.");
  // only a trip the driver could see in the list can be taken
  if (
    !(await db.trip.findFirst({
      where: { id: tripId, ...(await availableWhere(user, null)) },
      select: { id: true },
    }))
  )
    throw gone("TASK_NOT_AVAILABLE", "This task is no longer available.");
  const active = await db.trip.findFirst({
    where: { driverId: user.id, status: { in: ["LOADED", "IN_TRANSIT"] } },
  });
  if (active)
    throw gone(
      "DRIVER_HAS_ACTIVE_TASK",
      "Finish your current task before selecting another one.",
    );
  await db.$transaction(async (tx) => {
    const { count } = await tx.trip.updateMany({
      where: { id: tripId, driverId: null, status: "LOADED" },
      data: { driverId: user.id, version: { increment: 1 } },
    });
    if (!count)
      throw gone("TASK_NOT_AVAILABLE", "This task is no longer available.");
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "TRIP_DRIVER_SELECTED",
        entityType: "Trip",
        entityId: tripId,
        before: { driverId: null },
        after: { driverId: user.id },
      },
    });
  });
  return { trip: await loadBundle(tripId) };
}
async function loadBundle(tripId) {
  return bundleTrip(
    await db.trip.findUnique({ where: { id: tripId }, include: tripInclude }),
  );
}
export async function getToday(user, q) {
  const d = day(q.date ?? colomboToday()),
    ts = await trips(user, q.date ? d : null),
    payload = ts.map(bundleTrip);
  const raw = ts
    .flatMap((t) => [
      t.id,
      t.updatedAt.toISOString(),
      t.status,
      ...t.stops.flatMap((s) => [s.id, s.sequence, s.status]),
    ])
    .join("|");
  return {
    date: d.toISOString().slice(0, 10),
    generatedAt: new Date(),
    bundleVersion: crypto
      .createHash("sha1")
      .update(raw)
      .digest("hex")
      .slice(0, 12),
    trips: payload,
  };
}
export async function getSummary(user, q) {
  const b = await getToday(user, q),
    stops = b.trips.flatMap((t) => t.stops),
    done = stops.filter((s) => ["COMPLETED", "PARTIAL"].includes(s.status)),
    failed = stops.filter((s) => ["FAILED", "SKIPPED"].includes(s.status)),
    remaining = stops.filter((s) => !terminal.includes(s.status));
  const onTime = done.filter(
    (s) =>
      s.completedAt &&
      s.outlet.effectiveWindow?.endMin != null &&
      new Date(s.completedAt).getUTCHours() * 60 +
        new Date(s.completedAt).getUTCMinutes() <=
        s.outlet.effectiveWindow.endMin,
  );
  const next = remaining.sort((a, b) => a.sequence - b.sequence)[0];
  return {
    date: b.date,
    totalStops: stops.length,
    completedStops: done.length,
    failedStops: failed.length,
    remainingStops: remaining.length,
    onTimeStops: onTime.length,
    onTimePct: done.length
      ? +((100 * onTime.length) / done.length).toFixed(1)
      : 0,
    remainingDistanceKm: null,
    nextStop: next
      ? {
          stopId: next.id,
          sequence: next.sequence,
          outletName: next.outlet.name,
          effectiveWindow: next.outlet.effectiveWindow,
          predictedArrival: next.predictedArrival,
        }
      : null,
  };
}
export async function depart(user, input) {
  const t = await db.trip.findFirst({
    where: { id: input.tripId, driverId: user.id },
    include: {
      stops: {
        include: { allocations: { include: { order: true } }, outlet: true },
      },
      plan: true,
    },
  });
  if (!t) throw new AppError("Trip not found", 404);
  if (t.status === "IN_TRANSIT")
    return {
      trip: {
        id: t.id,
        code: t.code,
        status: t.status,
        actualDeparture: t.actualDeparture,
      },
    };
  if (t.status !== "LOADED")
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  if (
    await db.trip.findFirst({
      where: {
        vehicleId: t.vehicleId,
        status: "IN_TRANSIT",
        id: { not: t.id },
      },
    })
  )
    throw new AppError("VEHICLE_BUSY", 409);
  const when = corrected(input.recordedAtDevice, input.clockOffsetMs);
  await db.$transaction(async (tx) => {
    await transitionTripTx(tx, {
      tripId: t.id,
      toStatus: "IN_TRANSIT",
      data: { actualDeparture: when },
    });
    const ids = t.stops.flatMap((s) => s.allocations.map((a) => a.order.id));
    if (ids.length) {
      const os = await tx.order.findMany({ where: { id: { in: ids } } });
      for (const o of os) {
        await tx.order.update({
          where: { id: o.id },
          data: { status: "IN_TRANSIT", version: { increment: 1 } },
        });
        await tx.orderEvent.create({
          data: {
            orderId: o.id,
            fromStatus: o.status,
            toStatus: "IN_TRANSIT",
            actorId: user.id,
          },
        });
      }
    }
    await tx.dispatchPlan.updateMany({
      where: { id: t.planId, status: "PUBLISHED" },
      data: { status: "IN_EXECUTION", version: { increment: 1 } },
    });
    for (const s of t.stops)
      await notifyOutletTx(
        tx,
        s.outletId,
        "DRIVER_EN_ROUTE",
        "Driver is on the way",
        `Trip ${t.code} has departed.`,
        s.id,
      );
  });
  return {
    trip: {
      id: t.id,
      code: t.code,
      status: "IN_TRANSIT",
      actualDeparture: when,
    },
  };
}
export async function recordStopEvent(user, input) {
  if (input.clientMutationId) {
    const old = await repo.findEventByClientMutationId(input.clientMutationId);
    if (old) {
      if (old.actorId !== user.id)
        throw new AppError("clientMutationId already used", 409);
      return stopStateDTO(old.stop);
    }
  }
  const s = await repo.findStopForDriver(input.stopId, user.id);
  if (!s) throw new AppError("Stop not found", 404);
  if (s.trip.status !== "IN_TRANSIT")
    throw new AppError("INVALID_STOP_TRANSITION", 409);
  const map = {
      ARRIVED: { from: ["PENDING"], to: "ARRIVED", field: "arrivedAt" },
      UNLOADING_STARTED: {
        from: ["ARRIVED"],
        to: "UNLOADING",
        field: "unloadingStartedAt",
      },
      FAILED: { from: ["PENDING", "ARRIVED", "UNLOADING"], to: "FAILED" },
      SKIPPED: { from: ["PENDING"], to: "SKIPPED" },
    },
    m = map[input.type];
  if (!m.from.includes(s.status))
    throw new AppError("INVALID_STOP_TRANSITION", 409);
  const when = corrected(input.recordedAtDevice, input.clockOffsetMs);
  await db.$transaction(async (tx) => {
    await tx.stopEvent.create({
      data: {
        stopId: s.id,
        type: input.type,
        recordedAtDevice: input.recordedAtDevice,
        clockOffsetMs: input.clockOffsetMs,
        lat: input.lat,
        lng: input.lng,
        actorId: user.id,
        clientMutationId: input.clientMutationId,
        data: input.failureReason
          ? { failureReason: input.failureReason }
          : undefined,
      },
    });
    const data = { status: m.to };
    if (m.field) data[m.field] = when;
    if (["FAILED", "SKIPPED"].includes(input.type))
      data.failureReason = input.failureReason ?? "Stop skipped";
    await tx.stop.update({ where: { id: s.id }, data });
    if (["FAILED", "SKIPPED"].includes(input.type)) {
      for (const a of s.allocations) {
        await tx.order.update({
          where: { id: a.order.id },
          data: { status: "FAILED", version: { increment: 1 } },
        });
        await tx.orderEvent.create({
          data: {
            orderId: a.order.id,
            fromStatus: a.order.status,
            toStatus: "FAILED",
            actorId: user.id,
            reason: data.failureReason,
          },
        });
      }
      await notifyDispatchersTx(
        tx,
        s.trip.plan.depotId,
        "STOP_FAILED",
        "Delivery stop failed",
        data.failureReason,
        s.id,
      );
      await notifyOutletTx(
        tx,
        s.outletId,
        "STOP_FAILED",
        "Delivery could not be completed",
        data.failureReason,
        s.id,
      );
    }
    await finishTripIfDoneTx(tx, s.trip);
  });
  return stopStateDTO(await db.stop.findUnique({ where: { id: s.id } }));
}
export async function submitProof(user, input) {
  if (input.clientMutationId) {
    const old = await repo.findProofByClientMutationId(input.clientMutationId);
    if (old) {
      if (old.driverId !== user.id)
        throw new AppError("clientMutationId already used", 409);
      return {
        stop: stopStateDTO(old.stop),
        proof: proofDTO(old),
        nextStop: null,
      };
    }
  }
  const s = await repo.findStopForDriver(input.stopId, user.id);
  if (!s) throw new AppError("Stop not found", 404);
  if (s.proof) throw new AppError("PROOF_EXISTS", 409);
  if (
    !["ARRIVED", "UNLOADING"].includes(s.status) ||
    s.trip.status !== "IN_TRANSIT"
  )
    throw new AppError("INVALID_STOP_TRANSITION", 409);
  const items = s.allocations.flatMap((a) =>
    a.order.items.map((i) => ({
      i,
      order: a.order,
      limit: i.loadingChecks[0]?.loadedQty ?? i.quantity,
    })),
  );
  if (input.allDeliveredAsPlanned && items.some((x) => x.limit < x.i.quantity))
    throw new AppError("SHORT_LOADED_ITEMS", 422);
  let lines;
  if (input.allDeliveredAsPlanned)
    lines = items.map((x) => ({ orderItemId: x.i.id, deliveredQty: x.limit }));
  else {
    lines = input.lines ?? [];
    if (
      lines.length !== items.length ||
      new Set(lines.map((x) => x.orderItemId)).size !== items.length ||
      items.some((x) => !lines.some((y) => y.orderItemId === x.i.id))
    )
      throw new AppError("LINES_INCOMPLETE", 422);
    for (const l of lines) {
      const x = items.find((y) => y.i.id === l.orderItemId);
      if (!x || l.deliveredQty > x.limit)
        throw new AppError("LINES_INCOMPLETE", 422);
    }
  }
  const full = items.every(
      (x) =>
        lines.find((l) => l.orderItemId === x.i.id)?.deliveredQty ===
        x.i.quantity,
    ),
    when = corrected(input.capturedAtDevice, input.clockOffsetMs);
  const files = [input.signatureFileId, ...input.photoFileIds];
  const fs = await db.file.findMany({ where: { id: { in: files } } });
  if (
    fs.length !== files.length ||
    fs.some((f) => f.uploadedById !== user.id) ||
    fs.find((f) => f.id === input.signatureFileId)?.kind !== "SIGNATURE" ||
    fs
      .filter((f) => input.photoFileIds.includes(f.id))
      .some((f) => f.kind !== "POD_PHOTO")
  )
    throw new AppError("FILE_NOT_ATTACHABLE", 422);
  let pod;
  await db.$transaction(async (tx) => {
    pod = await tx.proofOfDelivery.create({
      data: {
        stopId: s.id,
        receiverName: input.receiverName,
        signatureFileId: input.signatureFileId,
        allDeliveredAsPlanned: full,
        capturedAtDevice: input.capturedAtDevice,
        driverId: user.id,
        clientMutationId: input.clientMutationId,
        photos: { create: input.photoFileIds.map((fileId) => ({ fileId })) },
      },
    });
    for (const l of lines)
      await tx.deliveredLine.create({ data: { ...l, stopId: s.id } });
    await tx.stopEvent.create({
      data: {
        stopId: s.id,
        type: "COMPLETED",
        recordedAtDevice: input.capturedAtDevice,
        clockOffsetMs: input.clockOffsetMs,
        actorId: user.id,
        clientMutationId: input.clientMutationId
          ? `${input.clientMutationId}:complete`
          : undefined,
      },
    });
    await tx.stop.update({
      where: { id: s.id },
      data: { status: full ? "COMPLETED" : "PARTIAL", completedAt: when },
    });
    for (const a of s.allocations) {
      const its = items.filter((x) => x.order.id === a.order.id),
        ofull = its.every(
          (x) =>
            lines.find((l) => l.orderItemId === x.i.id)?.deliveredQty ===
            x.i.quantity,
        ),
        to = ofull ? "DELIVERED" : "PARTIALLY_DELIVERED";
      await tx.order.update({
        where: { id: a.order.id },
        data: { status: to, version: { increment: 1 } },
      });
      await tx.orderEvent.create({
        data: {
          orderId: a.order.id,
          fromStatus: a.order.status,
          toStatus: to,
          actorId: user.id,
        },
      });
      await notifyOutletTx(
        tx,
        s.outletId,
        "ORDER_DELIVERED",
        ofull ? "Order delivered" : "Order partially delivered",
        "Please confirm receipt.",
        a.order.id,
        "CONFIRM_RECEIPT",
      );
      if (!ofull)
        await notifyDispatchersTx(
          tx,
          s.trip.plan.depotId,
          "DELIVERY_PARTIAL",
          "Partial delivery",
          `Order ${a.order.reference} was partially delivered.`,
          a.order.id,
        );
    }
    await finishTripIfDoneTx(tx, s.trip);
  });
  const proof = await db.proofOfDelivery.findUnique({
      where: { id: pod.id },
      include: { photos: true },
    }),
    stop = await db.stop.findUnique({ where: { id: s.id } }),
    next = await db.stop.findFirst({
      where: { tripId: s.tripId, status: "PENDING" },
      orderBy: { sequence: "asc" },
    });
  return {
    stop: stopStateDTO(stop),
    proof: proofDTO({
      ...proof,
      lines: lines.map((l) => ({
        ...l,
        orderItem: items.find((x) => x.i.id === l.orderItemId).i,
        loadedQty: items.find((x) => x.i.id === l.orderItemId).limit,
      })),
    }),
    nextStop: next ? stopStateDTO(next) : null,
  };
}
