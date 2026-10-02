import { sendSuccess } from "../../utils/apiResponse.js";
import {
    allocateOrderService,
    getVehicleOptionsService,
    unallocateOrderService,
    validateAllocationService,
} from "./allocations.service.js";

// who did it, from where (for the audit trail)
const auditContext = (req, res) => ({
    actorId: req.user.id,
    ip: req.ip,
    requestId: res.locals.requestId,
});

export const vehicleOptionsController = async (req, res) => {
    const { orderId, sort } = req.query;

    const result = await getVehicleOptionsService({ userId: req.user.id, orderId, sort });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Vehicle options retrieved successfully.",
        data: result,
    });
};

export const validateAllocationController = async (req, res) => {
    const { orderId, vehicleId, tripNumber } = req.body;

    const result = await validateAllocationService({ userId: req.user.id, orderId, vehicleId, tripNumber });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Allocation checked.",
        data: result,
    });
};

export const allocateController = async (req, res) => {
    const { orderId, vehicleId, tripNumber, position, acknowledgeWarnings } = req.body;

    const result = await allocateOrderService({
        userId: req.user.id,
        orderId,
        vehicleId,
        tripNumber,
        position,
        acknowledgeWarnings,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 201,
        message: "Order allocated successfully.",
        data: result,
    });
};

export const unallocateController = async (req, res) => {
    const result = await unallocateOrderService({
        userId: req.user.id,
        orderId: req.params.orderId,
        context: auditContext(req, res),
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order removed from its trip.",
        data: result,
    });
};
