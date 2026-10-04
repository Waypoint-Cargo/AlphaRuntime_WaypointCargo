import { sendSuccess } from "../../utils/apiResponse.js";
import {
	cancelOrder, checksOrderService, confirmOrder, createOrder, deferOrder,
	getOrderService, listOrderService, listOutletsForOrdersService, listStockCatalogService,
	submitOrder, summaryOrderService, updateOrderService,
} from "./orders.service.js";

export const stockCatalogController = async (req, res) =>
	sendSuccess(res, { data: await listStockCatalogService({ depotId: req.query.depotId }) });

export const outletsForOrdersController = async (req, res) =>
	sendSuccess(res, { data: await listOutletsForOrdersService() });

export const createOrderController = async (req, res) => sendSuccess(res, { statusCode: 201, message: "Order created.", data: await createOrder({ actor: req.user, input: req.body }) });
export const listOrdersController = async (req, res) => {
	const result = await listOrderService({ actor: req.user, filters: req.query });
	return sendSuccess(res, { data: result.items, meta: result.meta });
};
export const summaryOrdersController = async (req, res) => sendSuccess(res, { data: await summaryOrderService({ actor: req.user, deliveryDate: req.query.deliveryDate }) });
export const getOrderController = async (req, res) => sendSuccess(res, { data: await getOrderService({ actor: req.user, id: req.params.id }) });
export const updateOrderController = async (req, res) => sendSuccess(res, { data: await updateOrderService({ actor: req.user, id: req.params.id, input: req.body }) });
export const submitOrderController = async (req, res) => sendSuccess(res, { data: await submitOrder({ actor: req.user, id: req.params.id }) });
export const checksOrderController = async (req, res) => sendSuccess(res, { data: await checksOrderService({ actor: req.user, id: req.params.id }) });
export const confirmOrderController = async (req, res) => sendSuccess(res, { data: await confirmOrder({ actor: req.user, id: req.params.id }) });
export const cancelOrderController = async (req, res) => sendSuccess(res, { data: await cancelOrder({ actor: req.user, id: req.params.id, reason: req.body.reason }) });
export const deferOrderController = async (req, res) => sendSuccess(res, { data: await deferOrder({ actor: req.user, id: req.params.id, reason: req.body.reason }) });

