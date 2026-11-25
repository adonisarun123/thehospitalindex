/**
 * Vercel build entry. Production deploys apply pending migrations and the
 * idempotent reference seed before building, so schema and code ship together.
 * Preview deploys never touch the database.
 */
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL_UNPOOLED) throw new Error("DATABASE_URL_UNPOOLED is required for production builds.");
  run("npx tsx scripts/migrate.ts");
  run("npx tsx scripts/seed-reference.ts");
  // Reviewed hub landing copy (src/content/hubs): merged to main = approved.
  run("npx tsx scripts/sync-hub-content.ts");
} else {
  console.log("Non-production build: skipping migrations.");
}
run("npx next build");
