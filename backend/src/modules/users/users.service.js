import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { setUserInvalidateBefore } from "../../utils/tokenBlocklist.js";
// one transaction has to span users + sessions when a user is deactivated or re-scoped
import { revokeAllUserRefreshTokensTx } from "../auth/auth.repository.js";
import * as auditService from "../audit/audit.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import {
    findDepotsByIds,
    findOutletById,
    findUserDetailById,
    findUserDetailByIdTx,
    findUserScopeRow,
    listUsers,
    replaceUserDepotsTx,
    updateUserAccessTx,
    updateUserProfile,
    updateUserStatusTx,
} from "./users.repository.js";
import {
    toAccessSnapshot,
    toScopeDTO,
    toUserAdminDTO,
    toUserAdminListDTO,
    toUserProfileDTO,
} from "./users.dto.js";

const DEPOT_ROLES = [Role.DISPATCHER, Role.LOADER];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// "a driver", "an admin", "a store manager"
const roleLabel = (role) => {
    const name = role.toLowerCase().replace("_", " ");
    return `${/^[aeiou]/.test(name) ? "an" : "a"} ${name}`;
};

const scopeError = (errors) =>
    new AppError(
        "Invalid role assignment.",
        422,
        errors.map((error) => ({ ...error, code: "invalid_scope" })),
    );

// ---- used by other services ----

// Who the signed-in user is allowed to act for, read from the database (never from the request).
// Feed the result to the assertions in utils/scope.js.
export const getScope = async (userId) => {
    const row = await findUserScopeRow(userId);
    if (!row) throw new AppError("Account no longer exists.", 401);
    return toScopeDTO(row);
};

// The signed-in user's own profile with outlet / depots (GET /auth/me and PATCH /users/me).
export const getUserProfile = async (userId) => {
    const user = await findUserDetailById(userId);
    if (!user) throw new AppError("User not found.", 404);
    return toUserProfileDTO(user);
};

// ---- role / scope rules ----

// STORE_MANAGER -> one existing outlet, no depots
// DISPATCHER / LOADER -> at least one existing depot, no outlet
// DRIVER / ADMIN -> neither
// Returns the normalised { outletId, depotIds } or throws 422 with one entry per problem.
const validateAccess = async ({ role, outletId, depotIds }) => {
    const depots = [...new Set(depotIds ?? [])];
    const errors = [];

    if (role === Role.STORE_MANAGER) {
        if (!outletId) errors.push({ field: "outletId", message: "A store manager needs an outlet." });
        if (depots.length > 0) errors.push({ field: "depotIds", message: "A store manager cannot have depots." });
    } else if (DEPOT_ROLES.includes(role)) {
        if (depots.length === 0) {
            errors.push({ field: "depotIds", message: `${capitalize(roleLabel(role))} needs at least one depot.` });
        }
        if (outletId) errors.push({ field: "outletId", message: `${capitalize(roleLabel(role))} cannot have an outlet.` });
    } else {
        if (outletId) errors.push({ field: "outletId", message: `${capitalize(roleLabel(role))} cannot have an outlet.` });
        if (depots.length > 0) errors.push({ field: "depotIds", message: `${capitalize(roleLabel(role))} cannot have depots.` });
    }
    if (errors.length > 0) throw scopeError(errors);

    if (outletId && !(await findOutletById(outletId))) {
        errors.push({ field: "outletId", message: "Outlet not found." });
    }
    if (depots.length > 0) {
        const found = new Set((await findDepotsByIds(depots)).map((depot) => depot.id));
        const missing = depots.filter((depotId) => !found.has(depotId));
        if (missing.length > 0) {
            errors.push({ field: "depotIds", message: `Depot not found: ${missing.join(", ")}.` });
        }
    }
    if (errors.length > 0) throw scopeError(errors);

    return { outletId: outletId ?? null, depotIds: depots };
};

const findExistingUser = async (id) => {
    const user = await findUserDetailById(id);
    if (!user) throw new AppError("User not found.", 404);
    return user;
};

// ---- administration ----

export const listUsersService = async ({ role, isApproved, isActive, q, page, pageSize }) => {
    const where = {
        ...(role && { role }),
        ...(isApproved !== undefined && { isApproved }),
        ...(isActive !== undefined && { isActive }),
        ...(q && {
            OR: ["fullName", "username", "email", "employeeNumber"].map((field) => ({
                [field]: { contains: q, mode: "insensitive" },
            })),
        }),
    };

    const { rows, total } = await listUsers({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toUserAdminListDTO(rows, { page, pageSize, total });
};

export const getUserService = async ({ id }) => {
    return toUserAdminDTO(await findExistingUser(id));
};

export const approveUserService = async ({ id, role, outletId, depotIds, context }) => {
    const existing = await findExistingUser(id);
    if (existing.isApproved) {
        throw new AppError("User is already approved. Use the scope endpoint to change role, outlet or depots.", 409);
    }

    const access = await validateAccess({ role, outletId, depotIds });

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        const before = await findUserDetailByIdTx(tx, id);

        await updateUserAccessTx(tx, id, {
            role,
            outletId: access.outletId,
            isApproved: true,
            approvedAt: new Date(),
            approvedById: context.actorId,
        });
        await replaceUserDepotsTx(tx, id, access.depotIds);

        await auditService.recordTx(tx, {
            ...context,
            action: "USER_APPROVED",
            entityType: "User",
            entityId: id,
            before: toAccessSnapshot(before),
            after: { role, isApproved: true, isActive: before.isActive, ...access },
        });

        await notificationsService.notifyUsersTx(
            tx,
            [id],
            notificationsService.buildUserApprovedNotification({ userId: id, role }),
        );
    });

    return toUserAdminDTO(await findUserDetailById(id));
};

export const changeUserScopeService = async ({ id, role, outletId, depotIds, context }) => {
    if (id === context.actorId) {
        throw new AppError("You cannot change your own role, outlet or depots.", 409);
    }

    const existing = await findExistingUser(id);
    if (!existing.isApproved) {
        throw new AppError("User is not approved yet. Approve the user first.", 409);
    }

    const access = await validateAccess({ role, outletId, depotIds });

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        const before = await findUserDetailByIdTx(tx, id);

        await updateUserAccessTx(tx, id, { role, outletId: access.outletId });
        await replaceUserDepotsTx(tx, id, access.depotIds);

        // the new role only takes effect on the next sign-in
        await revokeAllUserRefreshTokensTx(tx, id);

        await auditService.recordTx(tx, {
            ...context,
            action: "USER_SCOPE_CHANGED",
            entityType: "User",
            entityId: id,
            before: toAccessSnapshot(before),
            after: { role, isApproved: true, isActive: before.isActive, ...access },
        });

        await notificationsService.notifyUsersTx(
            tx,
            [id],
            notificationsService.buildUserScopeChangedNotification({ userId: id, role }),
        );
    });

    // kill the user's outstanding access tokens, like logout-all
    await setUserInvalidateBefore(id);

    return toUserAdminDTO(await findUserDetailById(id));
};

export const setUserStatusService = async ({ id, isActive, context }) => {
    if (id === context.actorId && !isActive) {
        throw new AppError("You cannot deactivate your own account.", 409);
    }

    const existing = await findExistingUser(id);
    if (existing.isActive === isActive) return toUserAdminDTO(existing);

    const db = getPrisma();
    await db.$transaction(async (tx) => {
        await updateUserStatusTx(tx, id, isActive);
        if (!isActive) await revokeAllUserRefreshTokensTx(tx, id);

        await auditService.recordTx(tx, {
            ...context,
            action: "USER_STATUS_CHANGED",
            entityType: "User",
            entityId: id,
            before: { isActive: existing.isActive },
            after: { isActive },
        });
    });

    if (!isActive) await setUserInvalidateBefore(id);

    return toUserAdminDTO(await findUserDetailById(id));
};

// ---- own profile ----

export const updateMeService = async ({ userId, fullName, phone, avatarUrl }) => {
    const updated = await updateUserProfile(userId, { fullName, phone, avatarUrl });
    return toUserProfileDTO(updated);
};
