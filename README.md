# The Hospital Index

A nationwide directory of physical hospital branches in India. Built from the
software requirements specification v1.0 (23 November 2026); requirement ids
such as `SRH-04` or `SEO-01` in code comments refer to that document.

## Stack

Next.js 16 (App Router, TypeScript, React Server Components) · Neon PostgreSQL
· Drizzle ORM with reviewed SQL migrations · Tailwind CSS 4 · Node 22.

## What exists today

| Area | State |
|---|---|
| Schema (SRS §25–26) | 63 tables: public directory in `public`, patient/evidence/ops in `restricted` |
| Geography master | 28 states and 8 union territories, alias resolution (Bangalore → Bengaluru) |
| Public directory | Home, state, city, district, locality, specialty and service hubs, branch profile, search |
| Search (§05) | Filters, default and rating sort, typo tolerance, typeahead, pagination |
| Index control (§22–23) | Canonicals, noindex gates, real 404/308, sitemap index, JSON-LD |
| Editorial | 11 sourced guides, glossary, FAQ, about, editorial policy, medical disclaimer, RSS, llms.txt, OG images |
| Public API (§27) | `/api/v1` geographies, suggest, hospitals, hospital, reviews |
| Not built yet | OTP login, review submission, evidence storage, moderation, admin console, imports UI, correction forms |

There are **no hospitals** in the database. Branches enter only through a
sourced import with a recorded reuse basis (OPS-01/02).

## Editorial content

Guides live in `src/content/blog/*.ts` (one typed module per post), with the
glossary and site FAQ in `src/content`. They render statically at `/blog`,
`/blog/[slug]`, `/glossary` and `/faq`, feed `/blog/rss.xml`, `/llms.txt` and
`/sitemaps/blog.xml`, and emit BlogPosting, Blog, FAQPage and DefinedTermSet
JSON-LD. Every regulatory or numeric claim must cite a source in the post's
`sources` list, and `factsCheckedOn` records when they were last compared.
`npm test` checks slugs, internal links, dates and description lengths.
To add a post: create the module, register it in `src/content/blog/index.ts`.

## Run it

```bash
cp .env.example .env.local      # fill in the two Neon URLs
npm install
npm run db:migrate              # needs DATABASE_URL_UNPOOLED (direct connection)
npm run db:seed:reference       # states, UTs, starter taxonomy; idempotent
npm run dev
```

`npm run db:seed:fixtures` loads fictional acceptance fixtures (SRS §33). It
refuses to run against anything but a local database.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Deploys

Vercel builds run `scripts/vercel-build.mjs`. A production build applies pending
migrations and the reference seed, then builds; preview builds never touch the
database. Functions run in `sin1`, next to the Neon project.

## Decisions worth knowing

- **Cache Components / PPR are off** (`next.config.ts`). With them a dynamic
  route sends `200` before data resolves, so `notFound()` and
  `permanentRedirect()` cannot set the status. §22 needs real 404s and one-hop 308s.
- **Every data page renders per request.** No ISR yet: caching arrives with the
  outbox-driven invalidation of ARC-02, so a privacy removal can never be served stale.
- **Gates are code** (`src/lib/gates.ts`): publication (DATA-06), indexability
  (SEO-01) and completeness are derived by `recomputeBranchDerived` and
  enforced by check constraints. A branch cannot be `published` without passing.
- **Only facts with a public trust status are rendered** (`hospital_supplied`,
  `checked_against_source`). Sensitive filters additionally require a current check (DATA-03).
- **node-postgres, not the Neon HTTP driver**: the review write path needs real transactions.
- **All thresholds are in `src/lib/policy.ts`.** The SRS calls them planning defaults.

## Known gaps against the SRS

- `410 Gone` for deliberately removed pages is stored (`redirect.http_status`) but served as 404.
- Distance sort and "near me" (SRH-05/08) wait on independently sourced coordinates.
- The mobile filter panel is a native `<details>` element, not a focus-trapped sheet.
- Search tokenisation is untested on Indian scripts (DB-01).
- Synonyms in `db/seed/reference.sql` are inserted unreviewed and are inert until an editor approves them.
- LGD and other official geography codes are not loaded.
- `/privacy`, `/grievance` and `/corrections` are noindex placeholders awaiting owner and counsel input.
