// Background job: delete stale tokens from the database.
// What gets cleaned:
//   RefreshToken  — rows where `revoked = true`  OR  `expiresAt < now()`
//   PasswordReset — rows where `used = true`     OR  `expiresAt < now()`
// Schedule: Runs once immediately on startup and repeats every 24 hours.

import { getPrisma } from '../config/database.js';
import { logger } from '../config/logger.js';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours


export const cleanupExpiredTokens = async () => {
    const db = getPrisma();
    const now = new Date();

    try {
        const [{ count: deletedRefresh }, { count: deletedResets }] = await Promise.all([
            // Refresh tokens: revoked or past expiry
            db.refreshToken.deleteMany({
                where: {
                    OR: [
                        { revoked: true },
                        { expiresAt: { lt: now } },
                    ],
                },
            }),
            // Password reset tokens: used or past expiry
            db.passwordReset.deleteMany({
                where: {
                    OR: [
                        { used: true },
                        { expiresAt: { lt: now } },
                    ],
                },
            }),
        ]);

        logger.info('Token cleanup completed.', {
            deletedRefreshTokens: deletedRefresh,
            deletedPasswordResets: deletedResets,
        });
    } catch (err) {
        logger.error('Token cleanup job failed.', { error: err.message });
    }
}

// runs once immediately, then every 24 hours.
export const startCleanupJob = () => {
    cleanupExpiredTokens();

    // Schedule recurring runs
    const timer = setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);

    // Do not prevent graceful shutdown — this timer should not keep the process alive
    timer.unref();

    logger.info('Token cleanup job started.', {
        intervalHours: CLEANUP_INTERVAL_MS / (60 * 60 * 1000),
    });
};