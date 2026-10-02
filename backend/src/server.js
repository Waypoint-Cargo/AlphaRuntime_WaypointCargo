import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { config } from "./config/env.js";
import logger from "./config/logger.js";
import { startCleanupJob } from "./jobs/cleanupExpiredTokens.js";
import { startIdempotencyCleanupJob } from "./jobs/cleanupIdempotencyKeys.js";

let server = null;
let isShuttingDown = false;

// Start Server function
const startServer = async () => {
   // Confirm DB is reachable.
   await connectDatabase();

   server = app.listen(config.port, () => {
      logger.info(`Server started on http://localhost:${config.port}`, {
         environment: config.nodeEnv,
         corsOrigins: config.allowedOrigins,
         pid: process.pid,
         nodeVersion: process.version,
      });

      // background clean-up jobs: each runs now and then every 24 hours
      startCleanupJob();
      startIdempotencyCleanupJob();
   });

   // keepAliveTimeout = How long can this connection sit idle before I close it
   // headersTimeout   = How long do I wait for the request headers to fully arrive
   server.keepAliveTimeout = 65_000;
   server.headersTimeout = 66_000;
};

// Graceful shutdown sequence:
//   1. Stop the HTTP server from accepting new requests.
//   2. Wait for all active requests to finish processing.
//   3. Disconnect from the database (Prisma).
//   4. Disconnect from Redis.
//   5. Terminate the Node.js process.
const gracefulShutdown = async (signal) => {
   if (isShuttingDown) return;
   isShuttingDown = true;

   logger.info(`Received ${signal}. Starting graceful shutdown...`);

   // Stop accepting new connections and wait for in-flight requests to finish
   if (server) {
      await new Promise((resolve, reject) => {
         server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info("HTTP server closed. No longer accepting connections.");
   }

   try {
      //await disconnectDatabase();
      logger.info("Database connections closed.");
   } catch (err) {
      logger.error("Error disconnecting database during shutdown.", {
         error: err.message,
      });
   }

   try {
      //await disconnectRedis();
   } catch (err) {
      logger.error("Error disconnecting Redis during shutdown.", {
         error: err.message,
      });
   }

   logger.info("Graceful shutdown complete.");
   process.exit(0);
};

// If graceful shutdown stalls (stuck connections, unresponsive DB), this timer
// forces the process to exit. Prevents zombie processes in production.
const forceShutdown = () => {
   logger.error(
      `Graceful shutdown timed out after ${config.gracefulShutdownTimeoutMs}ms. Forcing exit.`,
   );
   process.exit(1);
};

// SIGTERM = sent by container orchestrators (K8s, Docker, ECS) and `kill` command
// SIGINT  = sent by Ctrl+C in the terminal
for (const signal of ["SIGTERM", "SIGINT"]) {
   process.on(signal, async () => {
      // Start a safety net timer — if graceful shutdown hasn't finished
      // within the timeout, force-kill the process.
      const timer = setTimeout(forceShutdown, config.gracefulShutdownTimeoutMs);
      // .unref() ensures this timer doesn't keep the event loop alive if
      // everything else shuts down cleanly before the timeout fires.
      timer.unref();

      try {
         await gracefulShutdown(signal);
      } catch (err) {
         logger.error("Graceful shutdown failed.", { error: err.message });
         process.exit(1);
      }
   });
}

// Uncaught Exception Handler
// Catches programming errors that escape all try/catch blocks.
// The process is in an undefined state after an uncaught exception, so the
// only safe action is to log the error and exit. A process manager (PM2,
// Docker restart policy, K8s) will restart the process.
process.on("uncaughtException", (err) => {
   logger.error("UNCAUGHT EXCEPTION — shutting down.", {
      error: err.message,
      stack: err.stack,
   });
   process.exit(1);
});

// Unhandled Rejection Handler
// Catches unhandled promise rejections (forgotten .catch() or missing await).
// In Node.js 22+, these crash the process by default. We log and exit
// explicitly to ensure clean shutdown behavior across all Node versions.
process.on("unhandledRejection", (reason) => {
   logger.error("UNHANDLED REJECTION — shutting down.", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
   });
   process.exit(1);
});

// Boot the server
startServer();