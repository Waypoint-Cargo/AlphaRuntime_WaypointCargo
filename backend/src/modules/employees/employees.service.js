import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import * as usersService from "../users/users.service.js";
import {
    createEmployeeTx,
    findEmployeeByEmailTx,
    findEmployeeById,
    listEmployees,
    updateEmployeeTx,
} from "./employees.repository.js";
import { toEmployeeDTO, toEmployeeListDTO } from "./employees.dto.js";

// Store managers manage the staff of their own outlet and no other.
const requireOutlet = async (userId) => {
    const scope = await usersService.getScope(userId);
    if (scope.role !== Role.STORE_MANAGER || !scope.outletId) {
        throw new AppError("Your account is not assigned to an outlet.", 403);
    }
    return scope.outletId;
};

const duplicateEmail = () =>
    new AppError("Another employee of this outlet already has this email.", 409, [
        { field: "email", message: "Already in use.", code: "unique" },
    ]);

// an employee of another outlet looks like one that does not exist
const findOwnEmployee = async (id, outletId, tx) => {
    const employee = await findEmployeeById(id, tx);
    if (!employee || employee.outletId !== outletId) throw new AppError("Employee not found.", 404);
    return employee;
};

export const listEmployeesService = async ({ userId, role, isActive, q, page, pageSize }) => {
    const outletId = await requireOutlet(userId);

    const where = {
        outletId,
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(q && {
            OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
            ],
        }),
    };

    const { rows, total } = await listEmployees({ where, skip: (page - 1) * pageSize, take: pageSize });
    return toEmployeeListDTO(rows, { page, pageSize, total });
};

export const createEmployeeService = async ({ userId, fullName, email, phone, role, isActive }) => {
    const outletId = await requireOutlet(userId);

    try {
        const created = await getPrisma().$transaction(async (tx) => {
            if (email && (await findEmployeeByEmailTx(tx, { outletId, email }))) throw duplicateEmail();

            return createEmployeeTx(tx, {
                outletId,
                fullName,
                email: email ?? null,
                phone: phone ?? null,
                role,
                ...(isActive !== undefined && { isActive }),
            });
        });
        return toEmployeeDTO(created);
    } catch (error) {
        // the same email added twice at the same moment
        if (error?.code === "P2002") throw duplicateEmail();
        throw error;
    }
};

export const updateEmployeeService = async ({ userId, id, fullName, email, phone, role, isActive }) => {
    const outletId = await requireOutlet(userId);

    try {
        const updated = await getPrisma().$transaction(async (tx) => {
            const employee = await findOwnEmployee(id, outletId, tx);

            if (email && email !== employee.email) {
                const other = await findEmployeeByEmailTx(tx, { outletId, email });
                if (other && other.id !== id) throw duplicateEmail();
            }

            return updateEmployeeTx(tx, id, {
                ...(fullName !== undefined && { fullName }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(role !== undefined && { role }),
                ...(isActive !== undefined && { isActive }),
            });
        });
        return toEmployeeDTO(updated);
    } catch (error) {
        if (error?.code === "P2002") throw duplicateEmail();
        throw error;
    }
};
