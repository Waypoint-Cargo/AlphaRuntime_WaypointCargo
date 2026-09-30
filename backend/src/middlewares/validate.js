const INVALID_JSON = Symbol("INVALID_JSON");

// Helper function to safely extract and parse the request body
const resolveBody = (req) => {
    // Check if the body contains a 'data' field (often used in multipart/form-data)
    if (req.body?.data !== undefined) {
        if (typeof req.body.data === "string") {
            try {
                return JSON.parse(req.body.data);
            } catch {
                return INVALID_JSON;
            }
        }
        return req.body.data;
    }
    return req.body ?? {};
};

export const validate = (schema) => (req, res, next) => {
    const reqBody = resolveBody(req);

    if (reqBody === INVALID_JSON) {
        return res.status(400).json({
            success: false,
            message: "Malformed JSON in request payload.",
            details: null,
            requestId: res.locals.requestId ?? null,
        });
    }

    // Validate the request (body, query, and params) against the schema
    const result = schema.safeParse({
        body: reqBody,
        query: req.query,
        params: req.params,
    });

    if (!result.success) {
        const validationIssues = result.error?.issues ?? result.error?.errors ?? [];

        const errors = validationIssues.map((issue) => ({
            field: issue.path?.slice(1).join(".") ?? "",
            message: issue.message,
            code: issue.code,
        }));

        return res.status(422).json({
            success: false,
            message: "Validation failed.",
            details: errors,
            requestId: res.locals.requestId ?? null,
        });
    }

    const { body, query, params } = result.data;

    // Update the original request object with the validated data
    if (params !== undefined) Object.assign(req.params, params);

    if (body !== undefined) req.body = body;

    if (query !== undefined) {
        // Use Object.defineProperty to safely overwrite req.query
        Object.defineProperty(req, "query", {
            value: query,
            writable: true,
            enumerable: true,
            configurable: true,
        });
    }

    return next();
};