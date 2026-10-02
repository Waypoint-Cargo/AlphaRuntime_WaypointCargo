// The result of one mutation in a batch. status is one of
//   APPLIED    done now
//   DUPLICATE  seen before: data is what the first attempt answered, originalStatus how it ended
//   REJECTED   will never succeed as sent (not recorded again): code and message say why
//   RETRYABLE  the server failed: nothing was recorded, send the mutation again

export const toAppliedResultDTO = (clientMutationId, data) => ({ clientMutationId, status: "APPLIED", data });

export const toDuplicateResultDTO = (row) => ({
    clientMutationId: row.clientMutationId,
    status: "DUPLICATE",
    originalStatus: row.result,
    code: row.resultCode ?? null,
    data: row.response ?? null,
});

export const toRejectedResultDTO = (clientMutationId, { code, statusCode, message, details }) => ({
    clientMutationId,
    status: "REJECTED",
    code,
    statusCode,
    message,
    details: details ?? null,
});

export const toRetryableResultDTO = (clientMutationId) => ({
    clientMutationId,
    status: "RETRYABLE",
    code: "SERVER_ERROR",
    message: "The server could not process this change right now. Send it again.",
});

export const toBatchDTO = ({ serverTime, results }) => ({ serverTime, results });

// What a mutation's result keeps of the service's answer: enough for the app, small enough to store.
export const toMutationDataDTO = (type, result) => {
    switch (type) {
        case "TRIP_DEPARTED":
            return { tripId: result.tripId, status: result.status, actualDeparture: result.actualDeparture };
        case "ISSUE_REPORTED":
            return { issueId: result.issue.id, reference: result.issue.reference, status: result.issue.status, created: result.created };
        case "LOADING_COMPLETED":
            return { tripId: result.tripId, status: result.status, departedShort: result.loading.departedShort, progress: result.progress };
        default:
            // STOP_EVENT, STOP_PROOF and LOAD_ITEM_CHECKED answer with a small state already
            return result;
    }
};
