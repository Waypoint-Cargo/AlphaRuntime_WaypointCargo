import { getPrisma } from "../../config/database.js";
const db = () => getPrisma();
export const stopInclude = {
  trip: { include: { plan: true, vehicle: true } },
  outlet: true,
  allocations: {
    include: {
      order: { include: { items: { include: { loadingChecks: true } } } },
    },
  },
  proof: { include: { photos: true } },
};
export const findStopForDriver = (stopId, driverId) =>
  db().stop.findFirst({
    where: { id: stopId, trip: { driverId } },
    include: stopInclude,
  });
export const findEventByClientMutationId = (id) =>
  id
    ? db().stopEvent.findUnique({
        where: { clientMutationId: id },
        include: { stop: true },
      })
    : null;
export const findProofByClientMutationId = (id) =>
  id
    ? db().proofOfDelivery.findUnique({
        where: { clientMutationId: id },
        include: { stop: true, photos: true },
      })
    : null;
export const countUnfinishedStops = (tx, tripId) =>
  tx.stop.count({
    where: {
      tripId,
      status: { notIn: ["COMPLETED", "PARTIAL", "FAILED", "SKIPPED"] },
    },
  });
