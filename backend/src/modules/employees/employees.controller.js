import { sendSuccess } from "../../utils/apiResponse.js";
import { createEmployeeService, listEmployeesService, updateEmployeeService } from "./employees.service.js";

export const listEmployeesController = async (req, res) => {
    const { role, isActive, q, page, pageSize } = req.query;

    const result = await listEmployeesService({ userId: req.user.id, role, isActive, q, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Employees retrieved successfully.",
        data: result,
    });
};

export const createEmployeeController = async (req, res) => {
    const { fullName, email, phone, role, isActive } = req.body;

    const result = await createEmployeeService({ userId: req.user.id, fullName, email, phone, role, isActive });

    return sendSuccess(res, {
        statusCode: 201,
        message: "Employee created successfully.",
        data: result,
    });
};

export const updateEmployeeController = async (req, res) => {
    const { fullName, email, phone, role, isActive } = req.body;

    const result = await updateEmployeeService({
        userId: req.user.id,
        id: req.params.id,
        fullName,
        email,
        phone,
        role,
        isActive,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Employee updated successfully.",
        data: result,
    });
};
