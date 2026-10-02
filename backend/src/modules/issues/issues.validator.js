import { z } from "zod";
import { IssueSource, IssueStatus, IssueType } from "../../generated/prisma/index.js";
import { clientId, idParams, idString, isoDate, isoDateTime, paginationQuery } from "../../utils/validation.js";

// reports about a line of an order need that line and the quantities
export const ITEM_ISSUE_TYPES = ["MISSING_ITEM", "DAMAGED_ITEM", "WRONG_ITEM", "QUANTITY_MISMATCH", "QUANTITY_SHORT"];

const quantity = z.number().int().min(0).max(1_000_000);

// The body of POST /issues. The offline sync endpoint validates its ISSUE_REPORTED payloads with this
// same schema. Which types a role may report is a business rule and lives in the service.
export const createIssueBodySchema = z
    .object({
        type: z.enum(IssueType),
        orderId: idString.optional(),
        tripId: idString.optional(),
        stopId: idString.optional(),
        orderItemId: idString.optional(),
        expectedQty: quantity.optional(),
        actualQty: quantity.optional(),
        description: z.string().trim().min(1).max(1000).optional(),
        photoFileIds: z.array(idString).max(5).default([]),
        reportedAtDevice: isoDateTime.optional(),
        clientMutationId: clientId.optional(),
    })
    .superRefine((issue, ctx) => {
        if (!issue.orderId && !issue.tripId && !issue.stopId) {
            ctx.addIssue({ code: "custom", path: ["orderId"], message: "Give at least one of orderId, tripId or stopId." });
        }
        if (issue.orderItemId && !issue.orderId) {
            ctx.addIssue({ code: "custom", path: ["orderId"], message: "orderId is required when orderItemId is given." });
        }
        if (ITEM_ISSUE_TYPES.includes(issue.type)) {
            for (const field of ["orderItemId", "expectedQty", "actualQty"]) {
                if (issue[field] === undefined) {
                    ctx.addIssue({ code: "custom", path: [field], message: `${field} is required for ${issue.type}.` });
                }
            }
        }
        if (new Set(issue.photoFileIds).size !== issue.photoFileIds.length) {
            ctx.addIssue({ code: "custom", path: ["photoFileIds"], message: "Each photo can be listed once." });
        }
    });

export const createIssueSchema = z.object({
    body: createIssueBodySchema,
});

export const listIssuesSchema = z.object({
    query: z
        .object({
            status: z.enum(IssueStatus).optional(),
            source: z.enum(IssueSource).optional(),
            type: z.enum(IssueType).optional(),
            orderId: idString.optional(),
            tripId: idString.optional(),
            from: isoDate.optional(),
            to: isoDate.optional(),
            ...paginationQuery,
        })
        .refine((query) => !query.from || !query.to || query.from <= query.to, {
            message: "'from' must not be after 'to'",
            path: ["to"],
        }),
});

export const issueIdSchema = z.object({
    params: idParams,
});

export const updateIssueStatusSchema = z.object({
    params: idParams,
    body: z
        .object({
            status: z.enum(["INVESTIGATING", "RESOLVED"]),
            resolutionNote: z.string().trim().min(1).max(1000).optional(),
        })
        .refine((body) => body.status === "RESOLVED" || body.resolutionNote === undefined, {
            message: "A resolution note can only be given when the issue is RESOLVED.",
            path: ["resolutionNote"],
        }),
});
