import { sendSuccess } from "../../utils/apiResponse.js";
import {
    cancelOrderService,
    confirmOrderService,
    createOrderService,
    getOrderChecksService,
    getOrderService,
    getOrdersSummaryService,
    listOrdersService,
    submitOrderService,
    updateOrderService,
} from "./orders.service.js";

export const createOrderController = async (req, res) => {
    const { tempClass, requestedDeliveryDate, items, specialInstructions, isFragile, isHighValue, submit } = req.body;

    const result = await createOrderService({
        userId: req.user.id,
        tempClass,
        requestedDeliveryDate,
        items,
        specialInstructions,
        isFragile,
        isHighValue,
        submit,
    });

    return sendSuccess(res, {
        statusCode: 201,
        message: submit ? "Order created and submitted." : "Order created.",
        data: result,
    });
};

export const updateOrderController = async (req, res) => {
    const { version, tempClass, requestedDeliveryDate, items, specialInstructions, isFragile, isHighValue } = req.body;

    const result = await updateOrderService({
        userId: req.user.id,
        id: req.params.id,
        version,
        tempClass,
        requestedDeliveryDate,
        items,
        specialInstructions,
        isFragile,
        isHighValue,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order updated successfully.",
        data: result,
    });
};

export const submitOrderController = async (req, res) => {
    const result = await submitOrderService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order submitted successfully.",
        data: result,
    });
};

export const getOrderChecksController = async (req, res) => {
    const result = await getOrderChecksService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Fulfilment checks completed.",
        data: result,
    });
};

export const confirmOrderController = async (req, res) => {
    const result = await confirmOrderService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: result.confirmation.rolledOver
            ? `Order confirmed. The cut-off had passed, so it moves to ${result.confirmation.deliveryDate}.`
            : "Order confirmed successfully.",
        data: result,
    });
};

export const cancelOrderController = async (req, res) => {
    const result = await cancelOrderService({ userId: req.user.id, id: req.params.id, reason: req.body.reason });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order cancelled successfully.",
        data: result,
    });
};

export const listOrdersController = async (req, res) => {
    const { deliveryDate, status, brand, tempClass, outletId, q, page, pageSize } = req.query;

    const result = await listOrdersService({
        userId: req.user.id,
        deliveryDate,
        statuses: status,
        brand,
        tempClass,
        outletId,
        q,
        page,
        pageSize,
    });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Orders retrieved successfully.",
        data: result,
    });
};

export const ordersSummaryController = async (req, res) => {
    const result = await getOrdersSummaryService({ userId: req.user.id, deliveryDate: req.query.deliveryDate });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order summary retrieved successfully.",
        data: result,
    });
};

export const getOrderController = async (req, res) => {
    const result = await getOrderService({ userId: req.user.id, id: req.params.id });

    return sendSuccess(res, {
        statusCode: 200,
        message: "Order retrieved successfully.",
        data: result,
    });
};
