/**
 * Copies reviewed hub landing copy from src/content/hubs into the database.
 *
 * The repo module is the source of truth and merging it to `main` is the
 * editorial review, so this runs on production builds only (see
 * scripts/vercel-build.mjs). City guidance goes to geography.local_context;
 * city × specialty/service guidance goes to hub_content (approved).
 *
 * It only writes rows for modules that exist. It never clears or un-approves
 * anything else, and it fails the build if a module names a slug that does not
 * resolve, so a typo cannot ship silently.
 *
 *   npx tsx scripts/sync-hub-content.ts            # write
 *   npx tsx scripts/sync-hub-content.ts --dry-run  # resolve and report only
 */
import { Client } from "pg";
import { hubPages, hubPath } from "../src/content/hubs";

const OWNER = "The Hospital Index editorial team";
const dryRun = process.argv.includes("--dry-run");

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL).");

async function main() {
  const db = new Client({ connectionString: url });
  await db.connect();
  const problems: string[] = [];
  try {
    await db.query("begin");
    for (const h of hubPages) {
      const path = hubPath(h);
      const city = await db.query<{ id: string }>(
        `select g.id from geography g join geography st on st.id = g.state_id
         where g.kind = 'settlement' and g.slug = $1 and st.slug = $2 and g.is_active`,
        [h.city, h.state],
      );
      if (city.rowCount !== 1) {
        problems.push(`${path}: city not found`);
        continue;
      }
      const geoId = city.rows[0].id;
      const reviewedAt = `${h.factsCheckedOn}T00:00:00+05:30`;

      if (h.kind === "city") {
        if (!dryRun)
          await db.query(
            `update geography set local_context = $1, local_context_reviewed_at = $2, updated_at = now() where id = $3`,
            [h.guidance, reviewedAt, geoId],
          );
      } else {
        const table = h.kind === "city-specialty" ? "specialty" : "service";
        const taxon = await db.query<{ id: string }>(`select id from ${table} where slug = $1 and is_active`, [h.taxon]);
        if (taxon.rowCount !== 1) {
          problems.push(`${path}: ${table} "${h.taxon}" not found`);
          continue;
        }
        const specialtyId = h.kind === "city-specialty" ? taxon.rows[0].id : null;
        const serviceId = h.kind === "city-service" ? taxon.rows[0].id : null;
        if (!dryRun)
          await db.query(
            `insert into hub_content (geography_id, specialty_id, service_id, locale, guidance, editorial_owner, reviewed_at, is_approved)
             values ($1, $2, $3, 'en', $4, $5, $6, true)
             on conflict on constraint hub_content_uq do update
               set guidance = excluded.guidance, editorial_owner = excluded.editorial_owner,
                   reviewed_at = excluded.reviewed_at, is_approved = true, updated_at = now()`,
            [geoId, specialtyId, serviceId, h.guidance, OWNER, reviewedAt],
          );
      }
      console.log(`${dryRun ? "ok (dry run)" : "synced"}  ${path}`);
    }
    if (problems.length) throw new Error(`Hub content sync failed:\n  ${problems.join("\n  ")}`);
    await db.query(dryRun ? "rollback" : "commit");
    console.log(`${hubPages.length} hub page(s) ${dryRun ? "checked" : "synced"}.`);
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
