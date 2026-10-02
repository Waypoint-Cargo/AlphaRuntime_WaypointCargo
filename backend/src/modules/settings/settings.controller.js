import { sendSuccess } from "../../utils/apiResponse.js";
import { listSettingsService, updateSettingService } from "./settings.service.js";

export const listSettingsController = async (req, res) => {
    const result = await listSettingsService();

    return sendSuccess(res, {
        statusCode: 200,
        message: "Settings retrieved successfully.",
        data: result,
    });
};

export const updateSettingController = async (req, res) => {
    const context = { actorId: req.user.id, ip: req.ip, requestId: res.locals.requestId };

    const result = await updateSettingService({
        key: req.params.key,
        value: req.body.value,
        context,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Setting updated successfully.",
        data: result,
    });
};
