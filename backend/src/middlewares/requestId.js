import { randomUUID } from "node:crypto";

export const requestId = (req, res, next) => {
    res.locals.requestId = req.headers["x-request-id"] || randomUUID();
    res.setHeader("X-Request-Id", res.locals.requestId);
    next();
};
