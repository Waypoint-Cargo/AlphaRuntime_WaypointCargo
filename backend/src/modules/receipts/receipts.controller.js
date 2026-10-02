import { sendSuccess } from "../../utils/apiResponse.js";
import { confirmReceiptService, getOrderProofService } from "./receipts.service.js";

export const confirmReceiptController = async (req, res) => {
    const { status, note } = req.body;

    const result = await confirmReceiptService({ userId: req.user.id, orderId: req.params.orderId, status, note });

    return sendSuccess(res, {
        statusCode: 201,
        message: "Receipt confirmed successfully.",
        data: result,
    });
};

export const getOrderProofController = async (req, res) => {
    const result = await getOrderProofService({ userId: req.user.id, orderId: req.params.orderId });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Proof of delivery retrieved successfully.",
        data: result,
    });
};
