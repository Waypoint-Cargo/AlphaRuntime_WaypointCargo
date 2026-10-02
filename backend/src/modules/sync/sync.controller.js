import { sendSuccess } from "../../utils/apiResponse.js";
import { submitBatchService } from "./sync.service.js";

export const submitBatchController = async (req, res) => {
    const result = await submitBatchService({
        user: req.user,
        idempotencyKey: req.get("Idempotency-Key"),
        body: req.body,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Sync batch processed.",
        data: result,
    });
};
