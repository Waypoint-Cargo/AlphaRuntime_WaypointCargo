import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./env.js";
import { logger } from "./logger.js";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5_000;

// @type {PrismaClient | null}
let prisma = null;

// Returns the singleton Prisma client instance.
// what happen from lazily initialization - it will create the instance only when it is called for the first time.
// log the prisma "query", "info", "warn", "error" in dev environment and only "warn", "error" in production
export const getPrisma = () => {
    if (!prisma) {

        const adapter = new PrismaPg({ connectionString: config.databaseUrl });

        prisma = new PrismaClient({
            adapter,
            log:
                config.nodeEnv === "development"
                    ? ["info", "warn", "error"]
                    : ["warn", "error"],
        });
    }
    return prisma;
};

// Establishes the database connection at server startup with retry logic.
export const connectDatabase = async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger.info(`Connecting to PostgreSQL... (attempt ${attempt}/${MAX_RETRIES})`);
            await getPrisma().$queryRaw`SELECT 1`;
            logger.info("PostgreSQL connected.");
            return; // Success — exit the retry loop.
        } catch (err) {
            logger.error(`PostgreSQL connection attempt ${attempt}/${MAX_RETRIES} failed.`, {
                message: err.message,
            });

            if (attempt === MAX_RETRIES) {
                // All retries exhausted. The process is useless without the DB,
                // so terminate immediately. The process manager will restart it.
                logger.error(
                    "All PostgreSQL connection attempts failed. Terminating process.",
                );
                process.exit(1);
            }

            // Wait before the next attempt. Using a named Promise makes the
            // intent clearer than a raw setTimeout wrapper.
            logger.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
};

// Drains the connection pool and releases all database connections.
export const disconnectDatabase = async () => {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
    }
};

// check the db connection
export const isDatabaseHealthy = async () => {
    try {
        await getPrisma().$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        logger.error("Database is not healthy", error);
        return false;
    }
};
