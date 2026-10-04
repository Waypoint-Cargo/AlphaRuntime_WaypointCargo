// Helpers for reading errors produced by the backend's `errorHandler` /
// `validate` middleware: { success: false, message, details?, requestId }
// RTK Query surfaces them as { status, data } (or { status: "FETCH_ERROR" } offline).

const NETWORK_MESSAGE = "Unable to reach the server. Check your connection and try again.";

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
    if (!error) return fallback;
    if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") return NETWORK_MESSAGE;

    const message = error.data?.message;
    if (typeof message === "string" && message) {
        // 422 from `validate`: put the first field message after the generic one
        const first = Array.isArray(error.data?.details) ? error.data.details[0]?.message : null;
        return first ? `${message} ${first}` : message;
    }
    return fallback;
}

// Maps a 422 validation response onto { fieldName: message } for react-hook-form.
export function getApiFieldErrors(error) {
    const details = error?.data?.details;
    if (error?.status !== 422 || !Array.isArray(details)) return {};

    return details.reduce((acc, { field, message }) => {
        if (field && !acc[field]) acc[field] = message;
        return acc;
    }, {});
}
