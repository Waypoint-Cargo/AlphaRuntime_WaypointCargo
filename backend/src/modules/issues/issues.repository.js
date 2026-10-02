import { getPrisma } from "../../config/database.js";

const issueSelect = {
    id: true,
    reference: true,
    source: true,
    type: true,
    status: true,
    order: { select: { id: true, reference: true, outletId: true, depotId: true, outlet: { select: { code: true, name: true } } } },
    trip: { select: { id: true, code: true, plan: { select: { depotId: true } } } },
    stop: {
        select: {
            id: true,
            sequence: true,
            outlet: { select: { code: true, name: true } },
            trip: { select: { plan: { select: { depotId: true } } } },
        },
    },
    orderItem: { select: { id: true, lineNo: true, itemName: true, unit: true } },
    expectedQty: true,
    actualQty: true,
    description: true,
    reportedBy: { select: { id: true, fullName: true, role: true } },
    reportedAtDevice: true,
    resolvedBy: { select: { id: true, fullName: true } },
    resolvedAt: true,
    resolutionNote: true,
    photos: { select: { fileId: true } },
    createdAt: true,
    updatedAt: true,
};

// ---- reads (pass a transaction to read inside it) ----

export const findIssueDetailById = async (id, tx) => {
    const client = tx ?? getPrisma();
    return client.issue.findUnique({ where: { id }, select: issueSelect });
};

export const findIssueByClientMutationId = async (clientMutationId, tx) => {
    const client = tx ?? getPrisma();
    return client.issue.findUnique({ where: { clientMutationId }, select: issueSelect });
};

// page of issues + total count for the same filter (newest first)
export const listIssues = async ({ where, skip, take }) => {
    const db = getPrisma();
    const [rows, total] = await db.$transaction([
        db.issue.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take, select: issueSelect }),
        db.issue.count({ where }),
    ]);
    return { rows, total };
};

// ---- writes ----

// next value of issue_ref_seq (the sequence lives in the business-constraints migration)
export const nextIssueNumberTx = async (tx) => {
    const rows = await tx.$queryRaw`SELECT nextval('issue_ref_seq')::int AS "value"`;
    return rows[0].value;
};

export const createIssueTx = (tx, data) => {
    return tx.issue.create({ data, select: { id: true, reference: true } });
};

export const createIssuePhotosTx = (tx, issueId, fileIds) => {
    return tx.issuePhoto.createMany({ data: fileIds.map((fileId) => ({ issueId, fileId })) });
};

// Compare-and-set of the status. { count: 0 } means the status changed since it was read.
export const updateIssueStatusTx = (tx, { id, fromStatus, data }) => {
    return tx.issue.updateMany({ where: { id, status: fromStatus }, data });
};
