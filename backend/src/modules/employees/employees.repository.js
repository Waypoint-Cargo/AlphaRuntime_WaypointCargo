import { getPrisma } from "../../config/database.js";

const employeeSelect = {
    id: true,
    outletId: true,
    fullName: true,
    email: true,
    phone: true,
    role: true,
    isActive: true,
    lastActiveAt: true,
    createdAt: true,
    updatedAt: true,
};

// ---- reads (pass a transaction to read inside it) ----

// page of employees + total count for the same filter (by name)
export const listEmployees = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.outletEmployee.findMany({ where, orderBy: [{ fullName: "asc" }, { id: "asc" }], skip, take, select: employeeSelect }),
        db.outletEmployee.count({ where }),
    ]);
    return { rows, total };
};

export const findEmployeeById = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.outletEmployee.findUnique({ where: { id }, select: employeeSelect });
};

export const findEmployeeByEmailTx = (tx, { outletId, email }) => {
    return tx.outletEmployee.findUnique({ where: { outletId_email: { outletId, email } }, select: { id: true } });
};

// ---- writes ----

export const createEmployeeTx = (tx, data) => {
    return tx.outletEmployee.create({ data, select: employeeSelect });
};

export const updateEmployeeTx = (tx, id, data) => {
    return tx.outletEmployee.update({ where: { id }, data, select: employeeSelect });
};
