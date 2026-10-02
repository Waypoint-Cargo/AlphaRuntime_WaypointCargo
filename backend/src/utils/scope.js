import { Role } from "../generated/prisma/index.js";
import { AppError } from "./appError.js";

// Pure scope assertions. `scope` is the object returned by usersService.getScope(userId):
//   { userId, role, outletId, depotIds }
// Nothing here touches Prisma or the request; ADMIN passes every check.

const FORBIDDEN = "You do not have access to this resource.";

const isAdmin = (scope) => scope?.role === Role.ADMIN;

// Store managers may only act on their own outlet.
export const assertOutletAccess = (scope, outletId) => {
    if (isAdmin(scope)) return;
    if (scope?.role === Role.STORE_MANAGER && outletId && scope.outletId === outletId) return;
    throw new AppError(FORBIDDEN, 403);
};

// Dispatchers and loaders may only act on the depots assigned to them.
export const assertDepotAccess = (scope, depotId) => {
    if (isAdmin(scope)) return;
    if (
        (scope?.role === Role.DISPATCHER || scope?.role === Role.LOADER) &&
        depotId &&
        scope.depotIds?.includes(depotId)
    ) {
        return;
    }
    throw new AppError(FORBIDDEN, 403);
};

// Drivers may only act on trips they drive.
export const assertTripDriver = (scope, trip) => {
    if (isAdmin(scope)) return;
    if (scope?.role === Role.DRIVER && trip?.driverId && trip.driverId === scope.userId) return;
    throw new AppError(FORBIDDEN, 403);
};
