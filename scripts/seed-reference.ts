/** Loads db/seed/reference.sql (states, UTs, starter taxonomy, link-only providers). Idempotent. */
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL).");

const client = new Client({ connectionString: url });
client
  .connect()
  .then(() => client.query(readFileSync("db/seed/reference.sql", "utf8")))
  .then(() => console.log("reference data loaded"))
  .finally(() => client.end());
