import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
   // Points to the schema file
   schema: "prisma/schema.prisma",

   // Migration files location
   migrations: {
      path: "prisma/migrations",
   },

   datasource: {
      url: env("DATABASE_URL"),
   },
});
