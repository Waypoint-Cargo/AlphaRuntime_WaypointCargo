const FIXED_WINDOW_SCRIPT = `
local key      = KEYS[1]
local limit    = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

-- Atomically increment the counter for this key
local current = redis.call("INCR", key)

-- Set the expiry only on first increment (avoids resetting the window on every hit)
if current == 1 then
    redis.call("PEXPIRE", key, windowMs)
end

local allowed = 1
if current > limit then
    allowed = 0
end

-- Get remaining TTL; fall back to full window if key has no expiry
local ttl = redis.call("PTTL", key)
if ttl < 0 then
    ttl = windowMs
end

local remaining = math.max(0, limit - current)
local retryMs   = 0
if allowed == 0 then
    retryMs = ttl
end

return { allowed, current, ttl, retryMs, remaining }
`;

// Default rate limit key: client IP address
const defaultKeyGenerator = (req) => req.ip;

// Default error message returned in 429 responses
const DEFAULT_ERROR_MESSAGE = "Too many requests";

const normalizeKey = (value) => {
    if (value === undefined || value === null) return "";
    return String(value).trim();
};

/**
 * Creates an Express rate limiter middleware using a fixed window algorithm
 * backed by Redis (via ioredis).
 *
 * @param {object}   options
 * @param {number}   options.limit              - Max requests allowed per window
 * @param {number}   options.windowMs           - Window size in milliseconds
 * @param {import("ioredis").Redis} options.redis - ioredis client instance
 * @param {string}   [options.prefix]           - Redis key prefix (default: "rate-limit")
 * @param {string}   [options.errorMessage]     - Message in 429 response body
 * @param {function} [options.keyGenerator]     - Function(req) → string key (default: req.ip)
 * @param {function} [options.skip]             - Function(req) → boolean; skip limiting if true
 * @param {"allow"|"block"} [options.fallbackBehavior] - What to do when Redis is unreachable (default: "allow")
 * @param {function} [options.onRedisError]     - Callback(error, req) for Redis errors
 * @returns {import("express").RequestHandler}
 *
 * @throws {Error} If redis, limit, or windowMs are invalid
 */
export const createRateLimiter = (options = {}) => {
    const {
        limit,
        windowMs,
        redis,
        keyGenerator = defaultKeyGenerator,
        prefix = "rate-limit",
        errorMessage = DEFAULT_ERROR_MESSAGE,
        skip = () => false,
        fallbackBehavior = "allow",
        onRedisError,
    } = options;

    // ── Validation ──
    if (!redis) {
        throw new Error("createRateLimiter: 'redis' client is required.");
    }
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error(
            "createRateLimiter: 'limit' must be a positive finite number.",
        );
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
        throw new Error(
            "createRateLimiter: 'windowMs' must be a positive finite number.",
        );
    }

    // ── Middleware ──
    return async function rateLimiter(req, res, next) {
        // Allow caller to skip rate limiting for specific requests
        // (e.g., health checks, internal traffic, whitelisted IPs)
        if (skip(req)) {
            return next();
        }

        const rawKey = normalizeKey(keyGenerator(req)) || normalizeKey(req.ip);

        // If we can't identify the client, pass through rather than blocking
        if (!rawKey) {
            return next();
        }

        const key = `${prefix}:${rawKey}`;
        const nowMs = Date.now();

        try {
            // Execute the Lua script atomically in Redis.
            // EVAL args: (script, numkeys, key, limit, windowMs)
            const result = await redis.eval(
                FIXED_WINDOW_SCRIPT,
                1, // number of KEYS
                key, // KEYS[1]
                limit, // ARGV[1]
                windowMs, // ARGV[2]
            );

            const [allowedRaw, , ttlRaw, retryMsRaw, remainingRaw] = result;

            const allowed = Number(allowedRaw) === 1;
            const remaining = Number(remainingRaw);
            const retryMs = Number(retryMsRaw);
            const resetAtSeconds = Math.ceil((nowMs + Number(ttlRaw)) / 1000);

            // Set standard rate limit headers
            res.setHeader("X-RateLimit-Limit", String(limit));
            res.setHeader("X-RateLimit-Remaining", String(remaining));
            res.setHeader("X-RateLimit-Reset", String(resetAtSeconds));

            if (!allowed) {
                res.setHeader("Retry-After", String(Math.ceil(retryMs / 1000)));

                return res.status(429).json({
                    error: errorMessage,
                    statusCode: 429,
                    limit,
                    remaining,
                    resetAt: resetAtSeconds,
                    requestId: req.id,
                });
            }

            return next();
        } catch (error) {
            // Notify caller of the Redis error (e.g., for metrics/alerting)
            if (typeof onRedisError === "function") {
                onRedisError(error, req);
            }

            if (fallbackBehavior === "block") {
                return res.status(429).json({
                    error: errorMessage,
                    statusCode: 429,
                    requestId: req.id,
                });
            }

            // Default: fail-open — allow the request through when Redis is down.
            // Better to serve traffic than to block everyone due to an infra issue.
            return next();
        }
    };
};
