import Redis from "ioredis";
import { config } from "./env.js";
import { logger } from "./logger.js";

if (!config.redisUrl) {
   logger.warn("REDIS_URL is not set — rate limiting will be disabled.");
}

const redis = config.redisUrl
   ? new Redis(config.redisUrl, {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
     })
   : null;

if (redis) {
   redis.on("connect", () => {
      logger.info("Redis connected.");
   });

   redis.on("ready", () => {});

   redis.on("error", (error) => {
      logger.warn("Redis connection error.", {
         message: error.message,
      });
   });

   redis.on("close", () => {
      logger.warn("Redis connection closed.");
   });

   redis.on("reconnecting", (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms.`);
   });
}

export const isRedisHealthy = async () => {
   if (!redis) return false;
   try {
      const response = await redis.ping();
      return response === "PONG";
   } catch {
      return false;
   }
};

// Gracefully disconnects the Redis client.
// Safe to call even if redis was never initialized.
export const disconnectRedis = async () => {
   if (redis) {
      await redis.quit();
      logger.info("Redis disconnected.");
   }
};

export default redis;
