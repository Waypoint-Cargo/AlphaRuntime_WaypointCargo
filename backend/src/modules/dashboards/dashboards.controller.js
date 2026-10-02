import { sendSuccess } from "../../utils/apiResponse.js";
import {
    getDispatcherDashboardService,
    getLoaderDashboardService,
    getStoreManagerDashboardService,
} from "./dashboards.service.js";

export const getDispatcherDashboardController = async (req, res) => {
    const { date, depotId } = req.query;

    const result = await getDispatcherDashboardService({ userId: req.user.id, date, depotId });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Dispatcher dashboard retrieved successfully.",
        data: result,
    });
};

export const getStoreManagerDashboardController = async (req, res) => {
    const result = await getStoreManagerDashboardService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Store manager dashboard retrieved successfully.",
        data: result,
    });
};

export const getLoaderDashboardController = async (req, res) => {
    const result = await getLoaderDashboardService({ userId: req.user.id, date: req.query.date });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Loader dashboard retrieved successfully.",
        data: result,
    });
};
