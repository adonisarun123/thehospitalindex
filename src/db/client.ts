import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseUrl } from "@/lib/env";
import * as schema from "./schema";

/**
 * One pool per server instance. DATABASE_URL must be Neon's POOLED url at
 * runtime (SRS §24); migrations use the direct url via scripts/migrate.ts.
 *
 * node-postgres rather than the Neon HTTP driver: the review write path
 * (ARC-02) needs real multi-statement transactions.
 */
const globalForDb = globalThis as unknown as { __thiPool?: Pool };

function pool(): Pool {
  if (!globalForDb.__thiPool) {
    globalForDb.__thiPool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return globalForDb.__thiPool;
}

export type Db = NodePgDatabase<typeof schema>;

let instance: Db | undefined;
export function db(): Db {
  instance ??= drizzle(pool(), { schema });
  return instance;
}
