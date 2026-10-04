import { getPrisma } from "../../config/database.js";
import { AppError } from "../../utils/appError.js";
const prisma = () => getPrisma();
export const routeDistanceKm = (points) => {
  if (!points.length || points.some((p) => p.lat == null || p.lng == null))
    return null;
  const R = 6371,
    toRad = (d) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dLat = toRad(Number(b.lat) - Number(a.lat)),
      dLng = toRad(Number(b.lng) - Number(a.lng));
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(Number(a.lat))) *
        Math.cos(toRad(Number(b.lat))) *
        Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(h));
  }
  return total;
};
export async function nextTripCodeTx(tx) {
  const rows = await tx.trip.findMany({ select: { code: true } });
  const max = rows.reduce(
    (m, r) => Math.max(m, Number(r.code?.match(/^R-(\d+)$/)?.[1] || 0)),
    0,
  );
  return `R-${String(max + 1).padStart(3, "0")}`;
}
export const findTripTx = (tx, x) =>
  tx.trip.findUnique({
    where: { vehicleId_deliveryDate_tripNumber: x },
    include: {
      stops: {
        orderBy: { sequence: "asc" },
        include: { outlet: true, allocations: { include: { order: true } } },
      },
    },
  });
export async function createTripTx(tx, data) {
  return tx.trip.create({ data: { ...data, code: await nextTripCodeTx(tx) } });
}
export async function resequenceStopsTx(tx, tripId, ids) {
  for (let i = 0; i < ids.length; i++)
    await tx.stop.update({
      where: { id: ids[i] },
      data: { sequence: 1000 + i },
    });
  for (let i = 0; i < ids.length; i++)
    await tx.stop.update({ where: { id: ids[i] }, data: { sequence: i + 1 } });
}
export async function findOrCreateStopTx(tx, { tripId, outletId, position }) {
  let s = await tx.stop.findUnique({
    where: { tripId_outletId: { tripId, outletId } },
  });
  if (s) return s;
  const count = await tx.stop.count({ where: { tripId } });
  s = await tx.stop.create({ data: { tripId, outletId, sequence: count + 1 } });
  if (position && position >= 1 && position <= count) {
    const all = await tx.stop.findMany({
      where: { tripId },
      orderBy: { sequence: "asc" },
      select: { id: true },
    });
    const ids = all.map((x) => x.id).filter((x) => x !== s.id);
    ids.splice(position - 1, 0, s.id);
    await resequenceStopsTx(tx, tripId, ids);
  }
  return s;
}
export async function deleteStopIfEmptyTx(tx, stopId) {
  const s = await tx.stop.findUnique({
    where: { id: stopId },
    include: { _count: { select: { allocations: true } } },
  });
  if (!s || s._count.allocations) return { deleted: false, tripEmpty: false };
  await tx.stop.delete({ where: { id: stopId } });
  const rest = await tx.stop.findMany({
    where: { tripId: s.tripId },
    orderBy: { sequence: "asc" },
    select: { id: true },
  });
  if (rest.length)
    await resequenceStopsTx(
      tx,
      s.tripId,
      rest.map((x) => x.id),
    );
  return { deleted: true, tripEmpty: rest.length === 0 };
}
export async function recomputeTripTotalsTx(tx, tripId) {
  const t = await tx.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: true,
      plan: { include: { depot: true } },
      stops: {
        orderBy: { sequence: "asc" },
        include: { outlet: true, allocations: { include: { order: true } } },
      },
    },
  });
  if (!t) throw new AppError("Trip not found", 404);
  let w = 0,
    v = 0;
  for (const s of t.stops)
    for (const a of s.allocations) {
      w += Number(a.order.totalWeightKg);
      v += Number(a.order.totalVolumeM3);
    }
  const points = [t.plan.depot, ...t.stops.map((s) => s.outlet), t.plan.depot];
  const dist = routeDistanceKm(points),
    fuelProfile = Number(t.vehicle.fuelKmPerLitre);
  const measurable = dist != null && fuelProfile > 0;
  if (dist != null) {
    for (let i = 0; i < t.stops.length; i++) {
      const leg = routeDistanceKm([points[i], points[i + 1]]);
      await tx.stop.update({
        where: { id: t.stops[i].id },
        data: { legDistanceKm: leg ?? 0 },
      });
    }
  }
  const distance = measurable ? dist : 0,
    fuel = measurable ? dist / fuelProfile : 0;
  await tx.trip.update({
    where: { id: tripId },
    data: {
      plannedWeightKg: w,
      plannedVolumeM3: v,
      plannedDistanceKm: distance,
      plannedFuelL: fuel,
      version: { increment: 1 },
    },
  });
  return {
    weightKg: w,
    volumeM3: v,
    distanceKm: distance,
    fuelL: fuel,
    measurable,
  };
}
const moves = {
  PLANNED: ["LOADING", "CANCELLED"],
  LOADING: ["LOADED", "CANCELLED"],
  LOADED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
export async function transitionTripTx(tx, { tripId, toStatus, data = {} }) {
  const t = await tx.trip.findUnique({ where: { id: tripId } });
  if (!t) throw new AppError("Trip not found", 404);
  if (t.status === toStatus) return t;
  if (!moves[t.status]?.includes(toStatus))
    throw new AppError("INVALID_STATUS_TRANSITION", 409);
  const r = await tx.trip.updateMany({
    where: { id: tripId, status: t.status },
    data: { status: toStatus, ...data, version: { increment: 1 } },
  });
  if (!r.count) throw new AppError("INVALID_STATUS_TRANSITION", 409);
  return tx.trip.findUnique({ where: { id: tripId } });
}
export const detailInclude = {
  vehicle: true,
  driver: { select: { id: true, fullName: true, phone: true } },
  plan: { include: { depot: true } },
  stops: {
    orderBy: { sequence: "asc" },
    include: { outlet: true, allocations: { include: { order: true } } },
  },
  _count: { select: { stops: true } },
};
export const getTrip = (id) =>
  prisma().trip.findUnique({ where: { id }, include: detailInclude });
export async function listTrips(where, skip, take) {
  const [items, total] = await Promise.all([
    prisma().trip.findMany({
      where,
      skip,
      take,
      orderBy: [{ vehicle: { code: "asc" } }, { tripNumber: "asc" }],
      include: detailInclude,
    }),
    prisma().trip.count({ where }),
  ]);
  return { items, total };
}
