export const sendSuccess = (
    res,
    { statusCode = 200, message = "Success", data = null, meta } = {}
) => {
    const body = {
        success: true,
        message,
        data,
        requestId: res.locals.requestId ?? null,
    };
    if (meta !== undefined && meta !== null) body.meta = meta;
    return res.status(statusCode).json(body);
};
