import redis from "../config/redis.js";
import { hashAccessToken } from "./tokens.js";

const AT_BLOCKLIST_PREFIX = 'blocklist:at:';
const USER_IAT_PREFIX = 'user:iat:';
const IAT_TTL_SECONDS = 7 * 24 * 60 * 60 // 7d


// add the access token to the blocklist of the redis
export const addToBlocklist = async (token, remainingTtlMs) => {
    const ttlSeconds = Math.ceil(remainingTtlMs / 1000);
    if (ttlSeconds <= 0) return; // Already expired — nothing to revoke
    const hash = hashAccessToken(token);
    await redis.set(`${AT_BLOCKLIST_PREFIX}${hash}`, '1', 'EX', ttlSeconds);
};

// check whether the access token is blocklisted or not
export const isBlocklisted = async (token) => {
    const hash = hashAccessToken(token);
    const result = await redis.get(`${AT_BLOCKLIST_PREFIX}${hash}`);
    return result !== null;
};


// store the invalidate user iat at redis when logout all
export const setUserInvalidateBefore = async (userId) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    await redis.set(
        `${USER_IAT_PREFIX}${userId}`,
        nowSeconds,
        'EX',
        IAT_TTL_SECONDS,
    );
};

// get the user invalidate iat from redis
export const getUserInvalidateBefore = async (userId) => {
    const value = await redis.get(`${USER_IAT_PREFIX}${userId}`);
    return value !== null ? parseInt(value, 10) : null;
};
