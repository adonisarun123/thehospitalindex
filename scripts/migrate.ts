/**
 * Applies ./drizzle migrations. Use a DIRECT connection (DATABASE_URL_UNPOOLED):
 * migrations take session-level locks that a transaction-mode pooler breaks.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL) before migrating.");

const pool = new Pool({ connectionString: url, max: 1 });
migrate(drizzle(pool), { migrationsFolder: "./drizzle" })
  .then(() => console.log("migrations applied"))
  .finally(() => pool.end());
