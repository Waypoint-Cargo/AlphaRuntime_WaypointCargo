// Background job: delete idempotency keys that are no longer needed.
// What gets cleaned:
//   IdempotencyKey — rows created more than 24 hours ago (a retry of a request that old is not expected)
// Schedule: Runs once immediately on startup and repeats every 24 hours.

import { getPrisma } from '../config/database.js';
import { logger } from '../config/logger.js';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const KEY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours


export const cleanupIdempotencyKeys = async () => {
    const db = getPrisma();
    const cutoff = new Date(Date.now() - KEY_MAX_AGE_MS);

    try {
        const { count } = await db.idempotencyKey.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });

        logger.info('Idempotency key cleanup completed.', { deletedKeys: count });
    } catch (err) {
        logger.error('Idempotency key cleanup job failed.', { error: err.message });
    }
}

// runs once immediately, then every 24 hours.
export const startIdempotencyCleanupJob = () => {
    cleanupIdempotencyKeys();

    // Schedule recurring runs
    const timer = setInterval(cleanupIdempotencyKeys, CLEANUP_INTERVAL_MS);

    // Do not prevent graceful shutdown — this timer should not keep the process alive
    timer.unref();

    logger.info('Idempotency key cleanup job started.', {
        intervalHours: CLEANUP_INTERVAL_MS / (60 * 60 * 1000),
    });
};
