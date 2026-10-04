import { sendSuccess } from "../../utils/apiResponse.js";
import {
    listEmployeesService,
    listPendingEmployeesService,
    approveEmployeeService,
    deleteEmployeeService,
} from "./employees.service.js";

// GET /employees — all approved employees, optionally filtered by role/active status
export const listEmployeesController = async (req, res) => {
    const { role, isActive, page, limit } = req.query;

    const { items, meta } = await listEmployeesService({ role, isActive, page, limit });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Employees retrieved successfully.",
        data: items,
        meta,
    });
};

// GET /employees/pending — users awaiting store-manager approval
export const listPendingEmployeesController = async (req, res) => {
    const { page, limit } = req.query;

    const { items, meta } = await listPendingEmployeesService({ page, limit });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Pending approval requests retrieved successfully.",
        data: items,
        meta,
    });
};

// POST /employees/:userId/approve — assign employee number, then email the employee
export const approveEmployeeController = async (req, res) => {
    const { userId } = req.params;

    const employee = await approveEmployeeService({
        userId,
        approvedById: req.user.id,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Employee approved successfully.",
        data: employee,
    });
};

// DELETE /employees/:userId — permanently remove a user
export const deleteEmployeeController = async (req, res) => {
    const { userId } = req.params;

    await deleteEmployeeService({ userId, requestingUserId: req.user.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "User deleted successfully.",
        data: null,
    });
};
