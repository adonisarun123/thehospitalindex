import { defineConfig } from "drizzle-kit";

/**
 * Migrations need a DIRECT (non-pooled) connection: set DATABASE_URL_UNPOOLED.
 * The pooled DATABASE_URL is for the running app only (SRS §24).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema/public.ts", "./src/db/schema/restricted.ts"],
  out: "./drizzle",
  schemaFilter: ["public", "restricted"],
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
