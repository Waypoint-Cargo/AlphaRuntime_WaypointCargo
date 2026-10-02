import { Role } from "../../generated/prisma/index.js";

// Nothing here ever exposes password, googleId, tokenVersion, failedAttempts or other internals.

const toOutletRef = (outlet) => (outlet ? { id: outlet.id, code: outlet.code, name: outlet.name } : null);

const toDepotRefs = (depots) =>
    (depots ?? [])
        .map(({ depot }) => ({ id: depot.id, code: depot.code, name: depot.name }))
        .sort((a, b) => a.code.localeCompare(b.code));

// The signed-in user's own view (also used by GET /auth/me).
// Outlet is only for store managers, depots only for dispatchers and loaders.
export const toUserProfileDTO = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    employeeNumber: user.employeeNumber,
    fullName: user.fullName,
    phone: user.phone ?? null,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    authProvider: user.authProvider,
    isApproved: user.isApproved,
    outlet: user.role === Role.STORE_MANAGER ? toOutletRef(user.outlet) : null,
    depots: user.role === Role.DISPATCHER || user.role === Role.LOADER ? toDepotRefs(user.depots) : [],
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// The administrator's view of any user.
export const toUserAdminDTO = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    employeeNumber: user.employeeNumber,
    fullName: user.fullName,
    phone: user.phone ?? null,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    authProvider: user.authProvider,
    isActive: user.isActive,
    isApproved: user.isApproved,
    approvedAt: user.approvedAt ?? null,
    approvedById: user.approvedById ?? null,
    outlet: toOutletRef(user.outlet),
    depots: toDepotRefs(user.depots),
    lastLoginAt: user.lastLoginAt ?? null,
    lockedUntil: user.lockedUntil ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

export const toUserAdminListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toUserAdminDTO),
    pagination: { page, pageSize, total },
});

// What the rest of the backend uses for authorization checks (see utils/scope.js).
export const toScopeDTO = (row) => ({
    userId: row.id,
    role: row.role,
    outletId: row.outletId ?? null,
    depotIds: row.depots.map((entry) => entry.depotId),
});

// Compact before/after snapshot of a user's access, for audit entries.
export const toAccessSnapshot = (user) => ({
    role: user.role,
    isApproved: user.isApproved,
    isActive: user.isActive,
    outletId: user.outlet?.id ?? null,
    depotIds: (user.depots ?? []).map(({ depot }) => depot.id).sort(),
});
