import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
   // Points to the schema file
   schema: "prisma/schema.prisma",

   // Migration files location
   migrations: {
      path: "prisma/migrations",
      // `npm run db:seed` — creates the first ADMIN from the ADMIN_* env vars
      seed: "node prisma/seed.js",
   },

   datasource: {
      url: env("DATABASE_URL"),
   },
});
