export class AppError extends Error {
    /**
     * @param {string}  message
     * @param {number}  [statusCode=500]
     * @param {*}       [details=null]
     * @param {boolean} [isOperational=true] - false = unexpected/programmer
     *                                         error; errorHandler will NOT
     *                                         trust its message/details in prod.
     */
    constructor(message, statusCode = 500, details = null, isOperational = true) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
