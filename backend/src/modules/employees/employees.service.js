import { AppError } from "../../utils/appError.js";
import { getPrisma } from "../../config/database.js";
import { Role } from "../../generated/prisma/index.js";
import {
    findEmployees,
    findPendingUsers,
    findUserById,
    findOutletById,
    findOutlets,
    findEmployeeNumbersByPrefix,
    approveUserTx,
    deleteUser,
} from "./employees.repository.js";
import { toEmployeeDTO, toEmployeeListResponseDTO, toOutletListDTO } from "./employees.dto.js";
import { sendAccountApprovedEmail } from "../email/email.service.js";

// Role → employee number prefix, e.g. DRIVER -> "dri_001"
const EMPLOYEE_NUMBER_PREFIX = {
    [Role.DRIVER]: "dri",
    [Role.STORE_MANAGER]: "man",
    [Role.DISPATCHER]: "dis",
    [Role.LOADER]: "loa",
};

// Up to this many attempts to pick a fresh employee number if a concurrent
// approval claims the same number first (unique constraint on employeeNumber).
const MAX_EMPLOYEE_NUMBER_ATTEMPTS = 5;

// Builds the next sequential employee number for a role prefix, based on the
// highest numeric suffix already issued (never reused, even after deletions).
const buildNextEmployeeNumber = async (prefix) => {
    const existingNumbers = await findEmployeeNumbersByPrefix(prefix);
    const highest = existingNumbers.reduce((max, employeeNumber) => {
        const suffix = Number.parseInt(employeeNumber.slice(prefix.length + 1), 10);
        return Number.isFinite(suffix) && suffix > max ? suffix : max;
    }, 0);
    return `${prefix}_${String(highest + 1).padStart(3, "0")}`;
};

export const listEmployeesService = async ({ role, outletId, isActive, page, limit }) => {
    const { items, total } = await findEmployees({
        role,
        outletId,
        isActive,
        skip: (page - 1) * limit,
        take: limit,
    });
    return toEmployeeListResponseDTO({ items, total, page, limit });
};

export const listPendingEmployeesService = async ({ page, limit }) => {
    const { items, total } = await findPendingUsers({
        skip: (page - 1) * limit,
        take: limit,
    });
    return toEmployeeListResponseDTO({ items, total, page, limit });
};

export const listOutletsService = async ({ brand, district }) => {
    const outlets = await findOutlets({ brand, district });
    return toOutletListDTO(outlets);
};

export const approveEmployeeService = async ({ userId, outletId, approvedById }) => {
    const user = await findUserById(userId);
    if (!user) throw new AppError("User not found.", 404);
    if (user.isApproved) throw new AppError("This user has already been approved.", 409);

    const outlet = await findOutletById(outletId);
    if (!outlet) throw new AppError("Outlet not found.", 404);
    if (!outlet.isActive) throw new AppError("Cannot assign an inactive outlet.", 400);

    const prefix = EMPLOYEE_NUMBER_PREFIX[user.role];
    if (!prefix) {
        throw new AppError(
            `Cannot generate an employee number for role ${user.role}.`,
            400,
        );
    }

    const db = getPrisma();
    let approvedUser;
    for (let attempt = 1; attempt <= MAX_EMPLOYEE_NUMBER_ATTEMPTS; attempt++) {
        const employeeNumber = await buildNextEmployeeNumber(prefix);
        try {
            approvedUser = await db.$transaction((tx) =>
                approveUserTx(tx, { userId, employeeNumber, outletId, approvedById }),
            );
            break;
        } catch (error) {
            // Another approval claimed this number between read and write — retry with a fresh one.
            const isDuplicateEmployeeNumber =
                error.code === "P2002" && error.meta?.target?.includes("employeeNumber");
            if (!isDuplicateEmployeeNumber || attempt === MAX_EMPLOYEE_NUMBER_ATTEMPTS) {
                throw error;
            }
        }
    }

    // Never let an email failure fail the approval — sendMail swallows/logs its own errors.
    await sendAccountApprovedEmail(approvedUser);

    return toEmployeeDTO(approvedUser);
};

export const deleteEmployeeService = async ({ userId, requestingUserId }) => {
    if (userId === requestingUserId) {
        throw new AppError("You cannot delete your own account.", 400);
    }

    const user = await findUserById(userId);
    if (!user) throw new AppError("User not found.", 404);

    try {
        await deleteUser(userId);
    } catch (error) {
        // Foreign key restrictions (orders created, trips driven, etc.) block the delete.
        if (error.code === "P2003") {
            throw new AppError(
                "This user has associated records (orders, trips, deliveries, etc.) and cannot be deleted. Deactivate the account instead.",
                409,
            );
        }
        throw error;
    }
};
