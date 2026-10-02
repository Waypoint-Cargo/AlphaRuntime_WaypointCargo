const toPerson = (user) => (user ? { id: user.id, fullName: user.fullName } : null);

export const toIssueSummaryDTO = (issue) => ({
    id: issue.id,
    reference: issue.reference,
    source: issue.source,
    type: issue.type,
    status: issue.status,
    order: issue.order
        ? {
              id: issue.order.id,
              reference: issue.order.reference,
              outletId: issue.order.outletId,
              outlet: { code: issue.order.outlet.code, name: issue.order.outlet.name },
          }
        : null,
    trip: issue.trip ? { id: issue.trip.id, code: issue.trip.code } : null,
    stop: issue.stop
        ? { id: issue.stop.id, sequence: issue.stop.sequence, outlet: { code: issue.stop.outlet.code, name: issue.stop.outlet.name } }
        : null,
    orderItem: issue.orderItem
        ? { id: issue.orderItem.id, lineNo: issue.orderItem.lineNo, itemName: issue.orderItem.itemName, unit: issue.orderItem.unit }
        : null,
    expectedQty: issue.expectedQty ?? null,
    actualQty: issue.actualQty ?? null,
    description: issue.description ?? null,
    reportedBy: { ...toPerson(issue.reportedBy), role: issue.reportedBy.role },
    reportedAtDevice: issue.reportedAtDevice ?? null,
    resolvedBy: toPerson(issue.resolvedBy),
    resolvedAt: issue.resolvedAt ?? null,
    resolutionNote: issue.resolutionNote ?? null,
    photoCount: issue.photos.length,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
});

export const toIssueDTO = (issue) => ({
    ...toIssueSummaryDTO(issue),
    photoFileIds: issue.photos.map((photo) => photo.fileId),
});

export const toIssueListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toIssueSummaryDTO),
    pagination: { page, pageSize, total },
});

// POST /issues answers 201 for a new issue and 200 when the same clientMutationId was sent before
export const toIssueCreatedDTO = (issue, { created }) => ({ issue: toIssueDTO(issue), created });

// who may see an issue: its reporter, the store manager of its order's outlet, the dispatchers of its depot
export const toIssueLinksDTO = (issue) => ({
    reportedById: issue.reportedBy.id,
    outletId: issue.order?.outletId ?? null,
    depotIds: [issue.order?.depotId, issue.trip?.plan.depotId, issue.stop?.trip.plan.depotId].filter(Boolean),
});

// snapshot for the audit log
export const toIssueSnapshot = (issue) => ({
    status: issue.status,
    resolvedAt: issue.resolvedAt ?? null,
    resolutionNote: issue.resolutionNote ?? null,
});
