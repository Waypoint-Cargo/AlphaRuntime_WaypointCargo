import { sendSuccess } from "../../utils/apiResponse.js";
import {
    approveUserService,
    changeUserScopeService,
    getUserService,
    listUsersService,
    setUserStatusService,
    updateMeService,
} from "./users.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    actorId: req.user.id,
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const listUsersController = async (req, res) => {
    const { role, isApproved, isActive, q, page, pageSize } = req.query;

    const result = await listUsersService({ role, isApproved, isActive, q, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Users retrieved successfully.",
        data: result,
    });
};

export const getUserController = async (req, res) => {
    const result = await getUserService({ id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "User retrieved successfully.",
        data: result,
    });
};

export const approveUserController = async (req, res) => {
    const { role, outletId, depotIds } = req.body;

    const result = await approveUserService({
        id: req.params.id,
        role,
        outletId,
        depotIds,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "User approved successfully.",
        data: result,
    });
};

export const changeUserScopeController = async (req, res) => {
    const { role, outletId, depotIds } = req.body;

    const result = await changeUserScopeService({
        id: req.params.id,
        role,
        outletId,
        depotIds,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "User scope updated successfully.",
        data: result,
    });
};

export const setUserStatusController = async (req, res) => {
    const result = await setUserStatusService({
        id: req.params.id,
        isActive: req.body.isActive,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: req.body.isActive ? "User activated successfully." : "User deactivated successfully.",
        data: result,
    });
};

export const updateMeController = async (req, res) => {
    const { fullName, phone, avatarUrl } = req.body;

    const result = await updateMeService({ userId: req.user.id, fullName, phone, avatarUrl });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Profile updated successfully.",
        data: result,
    });
};
