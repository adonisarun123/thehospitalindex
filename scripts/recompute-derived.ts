/**
 * Recomputes gates, completeness and the search document for every branch,
 * using the same code path as an editorial change (src/lib/derive.ts).
 *
 *   npx tsx scripts/recompute-derived.ts            # recompute only
 *   npx tsx scripts/recompute-derived.ts --publish  # also publish staged branches that pass DATA-06
 *
 * --publish moves `staged` branches that pass the publication gate to
 * `published`, then recomputes them again (the index gate needs the status).
 * It never touches disputed, closed, duplicate or retired branches, and never
 * unpublishes: a published branch that now fails is reported for an editor.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { recomputeBranchDerived } from "../src/lib/derive";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL).");
const publish = process.argv.includes("--publish");
const CONCURRENCY = Number(process.env.RECOMPUTE_CONCURRENCY ?? 12);

const pool = new Pool({ connectionString: url, max: CONCURRENCY });
const db = drizzle(pool);

async function each(ids: string[], label: string, fn: (id: string) => Promise<void>) {
  let i = 0;
  let done = 0;
  const started = Date.now();
  const worker = async () => {
    while (i < ids.length) {
      const id = ids[i++];
      await fn(id);
      if (++done % 2000 === 0) console.log(`${label}: ${done}/${ids.length} (${Math.round((Date.now() - started) / 1000)}s)`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`${label}: ${done}/${ids.length} done in ${Math.round((Date.now() - started) / 1000)}s`);
}

async function main() {
  const { rows } = await pool.query<{ id: string; status: string }>(
    `select id, status from hospital_branch where status in ('staged','checked','published') order by id`,
  );
  const failingPublished: string[] = [];
  const missing = new Map<string, number>();
  const passing: string[] = [];

  await each(rows.map((r) => r.id), "gates", async (id) => {
    try {
      const r = await recomputeBranchDerived(db, id);
      if (r.publication.pass && r.facts.status !== "published") passing.push(id);
      if (!r.publication.pass) for (const m of r.publication.missing) missing.set(m, (missing.get(m) ?? 0) + 1);
    } catch (e) {
      // hospital_branch_published_needs_gate: a published branch can no longer pass.
      if (String(e).includes("published_needs_gate")) failingPublished.push(id);
      else throw e;
    }
  });

  if (publish && passing.length) {
    const staged = new Set(rows.filter((r) => r.status === "staged").map((r) => r.id));
    const ids = passing.filter((id) => staged.has(id));
    await pool.query(
      `update hospital_branch set status = 'published', published_at = coalesce(published_at, now()), status_effective_on = current_date
       where id = any($1::uuid[]) and status = 'staged' and passes_publication_gate`,
      [ids],
    );
    await each(ids, "index gate", async (id) => {
      await recomputeBranchDerived(db, id);
    });
  }

  const summary = await pool.query(
    `select status, count(*)::int as branches, count(*) filter (where is_indexable)::int as indexable
     from hospital_branch group by 1 order by 1`,
  );
  console.table(summary.rows);
  console.log("Why staged branches fail the publication gate:");
  console.table([...missing.entries()].sort((a, b) => b[1] - a[1]).map(([gap, branches]) => ({ gap, branches })));
  if (failingPublished.length) console.warn(`${failingPublished.length} published branches no longer pass the gate:`, failingPublished.slice(0, 20));
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
