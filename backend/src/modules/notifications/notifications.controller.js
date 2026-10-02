import { sendSuccess } from "../../utils/apiResponse.js";
import {
    getUnreadCountService,
    listNotificationsService,
    markAllNotificationsReadService,
    markNotificationReadService,
} from "./notifications.service.js";

export const listNotificationsController = async (req, res) => {
    const { unread, page, pageSize } = req.query;

    const result = await listNotificationsService({ userId: req.user.id, unread, page, pageSize });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Notifications retrieved successfully.",
        data: result,
    });
};

export const getUnreadCountController = async (req, res) => {
    const result = await getUnreadCountService({ userId: req.user.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Unread count retrieved successfully.",
        data: result,
    });
};

export const markNotificationReadController = async (req, res) => {
    const result = await markNotificationReadService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Notification marked as read.",
        data: result,
    });
};

export const markAllNotificationsReadController = async (req, res) => {
    const result = await markAllNotificationsReadService({ userId: req.user.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "All notifications marked as read.",
        data: result,
    });
};
