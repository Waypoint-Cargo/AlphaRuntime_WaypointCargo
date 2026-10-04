import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { config } from "./config/env.js";
import { isDatabaseHealthy } from "./config/database.js";
import { logger } from "./config/logger.js";
import { isRedisHealthy } from "./config/redis.js";
import { requestId } from "./middlewares/requestId.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./utils/appError.js";
import { sendSuccess } from "./utils/apiResponse.js";
import router from "./routes/index.js";
import { authenticateUser } from "./middlewares/authenticate.js";

const app = express();

if (config.nodeEnv === "production") {
   app.set("trust proxy", 1);
}

// Assigns a unique ID to every request for end-to-end tracing across services.
app.use(requestId);

app.use(helmet());

app.use(
   cors({
      origin: config.allowedOrigins,
      credentials: true, // Allow cookies in cross-origin requests (needed for refresh tokens)
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
   }),
);

// Parses Cookie header and populates req.cookies — required for httpOnly refresh token reads.
app.use(cookieParser());

// Compresses response bodies using gzip/deflate. Reduces bandwidth usage by
// 60-80% for JSON/text responses. Browsers handle decompression transparently.
app.use(compression());

// Image uploads arrive as base64 JSON (5 MB file ~ 6.7 MB of text); this parser must run before the global one.
app.use("/api/files", express.json({ limit: "8mb" }));

// Limit request body size to 10KB to prevent payload-based DoS attacks.
// urlencoded with extended:true supports rich objects and arrays via qs library.
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Logs every completed HTTP request
app.use((req, res, next) => {
   const start = Date.now();

   res.on("finish", () => {
      logger.http(`${req.method} ${req.originalUrl}`, {
         statusCode: res.statusCode,
         durationMs: Date.now() - start,
         requestId: res.locals.requestId,
         ip: req.ip,
         userAgent: req.get("user-agent"),
      });
   });

   next();
});

app.use("/api", router);

// Public liveness probe — used by Docker / load balancer healthchecks.
// No auth required: just confirms the process is alive and accepting connections.
app.get("/ping", (req, res) => res.status(200).json({ status: "ok" }));

// Health check
app.get("/health", async (req, res) => {
   const [dbHealthy, redisHealthy] = await Promise.all([
      isDatabaseHealthy(),
      isRedisHealthy(),
   ]);

   const allHealthy = dbHealthy && redisHealthy;
   const status = allHealthy ? "ok" : "degraded";
   const statusCode = allHealthy ? 200 : 503;

   const data = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
         database: dbHealthy ? "connected" : "disconnected",
         redis: redisHealthy ? "connected" : "disconnected",
      },
   };

   return sendSuccess(res, {
      statusCode,
      message: "Health check completed",
      data,
   });
});

// 404 handler
app.use((req, res) => {
   throw new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use(errorHandler);

export default app;
