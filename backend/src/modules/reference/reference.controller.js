import { sendSuccess } from "../../utils/apiResponse.js";
import {
    getCutoffService,
    getOutletService,
    listCalendarService,
    listDepotsService,
    listOutletsService,
} from "./reference.service.js";

export const listDepotsController = async (req, res) => {
    const result = await listDepotsService();

    return sendSuccess(res, {
        statusCode: 200,
        message: "Depots retrieved successfully.",
        data: result,
    });
};

export const listOutletsController = async (req, res) => {
    const { depotId, brand, district, isMall, vanOnly, q, page, pageSize } = req.query;

    const result = await listOutletsService({
        userId: req.user.id,
        depotId,
        brand,
        district,
        isMall,
        vanOnly,
        q,
        page,
        pageSize,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Outlets retrieved successfully.",
        data: result,
    });
};

export const getOutletController = async (req, res) => {
    const result = await getOutletService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Outlet retrieved successfully.",
        data: result,
    });
};

export const listCalendarController = async (req, res) => {
    const { from, to } = req.query;

    const result = await listCalendarService({ from, to });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Calendar retrieved successfully.",
        data: result,
    });
};

export const getCutoffController = async (req, res) => {
    const result = await getCutoffService({ deliveryDate: req.query.deliveryDate });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Cut-off retrieved successfully.",
        data: result,
    });
};
