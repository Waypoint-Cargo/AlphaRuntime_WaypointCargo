import { AppError } from "../../utils/appError.js";
import { Role } from "../../generated/prisma/index.js";
import { getPrisma } from "../../config/database.js";
import { assertDepotAccess, assertOutletAccess } from "../../utils/scope.js";
import * as usersService from "../users/users.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import * as ordersService from "../orders/orders.service.js";
import { createReceiptTx, findDeliveredLines, findOrderProof } from "./receipts.repository.js";
import { toOrderProofDTO, toReceiptDTO } from "./receipts.dto.js";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const RECEIVABLE_STATUSES = ["DELIVERED", "PARTIALLY_DELIVERED"];

const ORDER_STATUS_OF_RECEIPT = {
    CONFIRMED: "RECEIVED",
    CONFIRMED_WITH_ISSUES: "RECEIVED_WITH_ISSUES",
};

const alreadyConfirmed = (order) =>
    new AppError(`Order ${order.reference} has already been confirmed.`, 409, [
        { code: "RECEIPT_EXISTS", orderId: order.id },
    ]);

// ---- confirm receipt ----

// The store manager confirms what arrived: the order becomes RECEIVED, or RECEIVED_WITH_ISSUES, and the
// depot's dispatchers are told. Only for an order of the manager's own outlet that was DELIVERED or
// PARTIALLY_DELIVERED and has no receipt yet.
export const confirmReceiptService = async ({ userId, orderId, status, note }) => {
    const scope = await usersService.getScope(userId);
    if (scope.role !== Role.STORE_MANAGER) throw new AppError("Only store managers can confirm a receipt.", 403);

    const order = await ordersService.getOrderRef(orderId);
    assertOutletAccess(scope, order.outletId);
    if (order.receipt) throw alreadyConfirmed(order);
    if (!RECEIVABLE_STATUSES.includes(order.status)) {
        throw new AppError(`Order ${order.reference} is ${order.status}; only delivered orders can be confirmed.`, 409, [
            { code: "ORDER_NOT_DELIVERED", orderId, currentStatus: order.status },
        ]);
    }

    const [profile, dispatcherIds] = await Promise.all([
        usersService.getUserProfile(userId),
        notificationsService.usersOfDepot(order.depotId, Role.DISPATCHER),
    ]);

    try {
        const receipt = await getPrisma().$transaction(async (tx) => {
            // the receipt is written first: a second confirmation at the same moment stops on the unique order id
            const created = await createReceiptTx(tx, { orderId, status, confirmedById: userId, note: note ?? null });

            await ordersService.transitionOrdersTx(tx, {
                orderIds: [orderId],
                toStatus: ORDER_STATUS_OF_RECEIPT[status],
                actorId: userId,
                reason: note,
                data: { receipt: status },
            });

            await notificationsService.notifyUsersTx(
                tx,
                dispatcherIds,
                notificationsService.buildReceiptConfirmedNotification({
                    orderId,
                    reference: order.reference,
                    outletName: profile.outlet?.name ?? "The outlet",
                    withIssues: status === "CONFIRMED_WITH_ISSUES",
                }),
            );

            return created;
        }, TX_OPTIONS);

        return toReceiptDTO(receipt, { id: orderId, reference: order.reference, status: ORDER_STATUS_OF_RECEIPT[status] });
    } catch (error) {
        if (error?.code === "P2002") throw alreadyConfirmed(order);
        throw error;
    }
};

// ---- proof of delivery of an order ----

// What was delivered to the outlet: receiver, capture time, whether everything came as planned, the
// signature and photo file ids (read them with GET /files/:id), the delivered lines against the ordered
// quantities and the stop's arrival and completion. Store manager of the outlet, dispatcher of the depot.
export const getOrderProofService = async ({ userId, orderId }) => {
    const scope = await usersService.getScope(userId);

    const order = await ordersService.getOrderRef(orderId);
    if (scope.role === Role.STORE_MANAGER) assertOutletAccess(scope, order.outletId);
    else assertDepotAccess(scope, order.depotId);

    const proof = await findOrderProof(orderId);
    if (!proof) throw new AppError("There is no proof of delivery for this order yet.", 404);

    return toOrderProofDTO({ order, proof, lines: await findDeliveredLines(orderId) });
};
