// Shared depot-scope guards for dispatcher modules (plans, allocations).
import { AppError } from "../../utils/appError.js";

// `scope` comes from orders.adapters getScope(): { all: true } for admins, otherwise { depotIds }.
export const assertDepotAccess = (scope, depotId) => {
	if (scope.all) return;
	if (!scope.depotIds?.includes(depotId)) {
		throw new AppError("You do not have access to this depot.", 403, { code: "DEPOT_FORBIDDEN" });
	}
};

// Picks the depot for an operation: explicit id (checked against scope), else the dispatcher's only depot.
export const resolveDepotId = (scope, depotId) => {
	if (depotId) {
		assertDepotAccess(scope, depotId);
		return depotId;
	}
	if (!scope.all && scope.depotIds?.length >= 1) return scope.depotIds[0];
	throw new AppError("depotId is required.", 422, { code: "DEPOT_REQUIRED" });
};
