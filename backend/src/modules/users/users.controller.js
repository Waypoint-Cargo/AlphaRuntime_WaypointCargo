import { sendSuccess } from "../../utils/apiResponse.js";
import { getProfileService, deleteOwnAccountService } from "./users.service.js";

// GET /users/me — the caller's own full profile
export const getProfileController = async (req, res) => {
    const profile = await getProfileService({ userId: req.user.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Profile retrieved successfully.",
        data: profile,
    });
};

// DELETE /users/me — the caller deletes their own account
export const deleteOwnAccountController = async (req, res) => {
    await deleteOwnAccountService({
        userId: req.user.id,
        accessToken: req.accessToken,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Account deleted successfully.",
        data: null,
    });
};
