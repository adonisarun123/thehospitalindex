# Weekly content playbook — The Hospital Index

The operating manual for the weekly content run. Whoever runs it (Claude on the
Monday schedule, or a person) follows this file. Change the rules here, not in
the scheduled task's prompt.

## Output each week

| What | How many | Where it goes |
|---|---|---|
| Blog posts answering one real patient question each | 4 | `src/content/blog/<name>.ts`, registered in `src/content/blog/index.ts` |
| Hub landing pages (city × specialty, city × service, or city) | 3 | `src/content/hubs/<YYYY-wNN>.ts`, registered in `src/content/hubs/index.ts` |

Everything ships as **one pull request** on branch `content/<YYYY-wNN>` titled
`Content: week <YYYY-wNN> (4 posts, 3 hubs)`. Nothing is committed to `main`.
Merging the PR is the editorial review: on the production build,
`scripts/sync-hub-content.ts` writes hub guidance to the database
(`hub_content` / `geography.local_context`), which is what makes those hubs
indexable. Do not write hub content to the database directly.

## 1. Pick the questions (People-Also-Ask, approximated)

We have no SERP API, so true PAA boxes are not available. Approximate them,
and record the evidence in the PR description for every pick:

1. Start from a backlog cluster in `content-ops/backlog.md`, or from a gap
   you notice in the existing posts and hubs.
2. Run 2–4 web searches on the seed phrase and its variants (“what is…”,
   “can a hospital…”, “how to…”, “is … covered”). Note recurring questions in
   result titles and in FAQ sections of the top-ranking pages (insurers,
   aggregators, news explainers, government FAQs).
3. A question qualifies if it appears, in substance, on **at least two
   independent sites** in the results. Write those two URLs in the PR as
   “question evidence”.
4. Check `content-ops/log.md` and the existing `slug`/`keywords` across
   `src/content/blog/*.ts`. Do not publish a post whose main question is
   already answered by an existing post. Extend that post instead (update
   `dateModified`) and count it as one of the four.

Mix each week: at least one post in "Insurance and costs" or "Patient rights",
at least one in "Choosing care", and every post links to at least one hub.

## 2. Pick the hubs

Run this read-only query (Neon project `patient-boat-94859550`) and take the
top 3 rows not already in `src/content/hubs/`. Spread them across different
states. Prefer city × specialty; use city × service or a city page when the
data supports it (city hubs need ≥3 indexable branches, taxonomy hubs ≥5 —
see `POLICY.index` in `src/lib/policy.ts`).

```sql
select st.slug state, g.slug city, g.name city_name, s.slug taxon, s.name taxon_name,
       count(distinct b.id) indexable
from hospital_branch b
join geography g  on g.id = b.settlement_id
join geography st on st.id = b.state_id
join branch_offering o on o.branch_id = b.id and o.ended_at is null
     and o.status in ('hospital_supplied','checked_against_source') and o.specialty_id is not null
join specialty s on s.id = o.specialty_id
where b.is_indexable
  and not exists (select 1 from hub_content h where h.geography_id = g.id and h.specialty_id = s.id)
group by 1,2,3,4,5 having count(distinct b.id) >= 5
order by indexable desc limit 30;
```

Then pull the facts for each chosen hub (published and indexable counts, how
many publish insurer/TPA lists, whether emergency hours are known). Only state
what the data supports, with the date. If a field is mostly unknown, say so
plainly; that is useful to the reader.

## 3. Write — rules that are not optional

This is health and money content (YMYL). Accuracy beats volume.

- **Answer first.** The `summary` answers the post's question in 2–3
  sentences. H2s are phrased the way people ask.
- **India-specific.** Indian law, regulators, schemes, terms and ₹.
- **Every regulatory, legal or numerical claim has a primary source** in
  `sources` (IRDAI, NHA, NABH, MoHFW, NMC, India Code, court judgments,
  PIB). A secondary source (law firm note, newspaper) is allowed only
  alongside, or when labelled as such in the text.
- **Open the source and confirm the claim** before citing it. If you cannot
  confirm it, say less or drop it. Never cite a source you did not open.
- **Say when the position is uncertain** (e.g. a rule that may have been
  superseded) using a `warning` callout.
- **No clinical advice.** No dosing, no “which treatment is best”, no
  diagnosis. Practical, process and rights content only. Emergencies always
  point to 112.
- **No rankings and no “best hospital” claims.** “Best” questions are
  answered with how to compare, linking to the listing.
- **No invented statistics, quotes, people, case names or URLs.** Worked
  examples are fine when labelled illustrative.
- **No named hospital is praised or criticised.**
- Plain English, short sentences, no hype. Author is “The Hospital Index
  editorial team”.

### Blog post format (`Post` in `src/content/types.ts`)

- 700–1,500 words (`wordCount`), meta `description` 110–160 characters.
- Open with an `info` callout disclaimer for insurance, legal or medical
  topics.
- 3–5 `faqs` that are the PAA questions from step 1 (become FAQPage
  JSON-LD).
- 2–4 internal links to existing posts or hubs using `[text](/path)`;
  `related` lists 3 existing slugs.
- `datePublished`, `dateModified`, `factsCheckedOn` = the run date.

### Hub format (`HubPage` in `src/content/types.ts`)

- `guidance`: one plain-text paragraph, 90–220 words, no marks. Says what the
  specialty covers, the dated count, what the NABH listing does and does not
  mean, the 3–4 questions worth asking a branch for this specialty, and what
  our data does not yet confirm (e.g. emergency hours).
- 3–6 `faqs`, including the local “best … in <city>” question (answered
  without ranking) and a cashless or PM-JAY question.
- `sources`: at least NABH and 112/ERSS; add the PM-JAY finder or the
  relevant Act where used.

## 4. Verify before opening the PR

```
npm ci
npx tsc --noEmit
npx vitest run
npx eslint src scripts
npx next build
```

All must pass. Then re-read each post against its sources one claim at a time.
Confirm every hub's slugs resolve (state, city, taxon) with a read-only query.

## 5. Commit, push the branch, open the PR, log it

The weekly run works in Arun's local clone at
`/Users/arun/Projects/thehospitalindex`. Run git and npm commands on the Mac
itself (Desktop Commander), where Arun's GitHub login is available; the
sandbox shell cannot push.

1. Before starting: the working tree must be clean and on `main`. Run
   `git fetch origin`. If local `main` is only behind `origin/main`, run
   `git merge --ff-only origin/main`. If it has diverged, or the tree is
   dirty, stop and report; never stash, reset or overwrite Arun's work.
   Branch from local `main`.
2. Create `content/<YYYY-wNN>`, add the week's files, commit with message
   `Content: week <YYYY-wNN> (4 posts, 3 hubs)`.
3. Write the PR description to `content-ops/prs/<YYYY-wNN>.md` in the same
   commit: per item the title or hub path, the main question, the two
   question-evidence URLs, and any claim you were unsure of.
4. Append one line per item to `content-ops/log.md`. Tick off used backlog
   items and add 4+ new clusters you came across.
5. `git push -u origin content/<YYYY-wNN>`, then
   `gh pr create --base main --head content/<YYYY-wNN> --title "Content: week <YYYY-wNN> (4 posts, 3 hubs)" --body-file content-ops/prs/<YYYY-wNN>.md`.
   Never push to `main` and never merge. Switch the clone back to `main`
   when done.
6. If an earlier weekly PR is still open, still do this week, and say so in
   the PR body.

## Stop and ask a person instead of publishing when

- a source contradicts an existing post (flag it in the PR; fix if clear),
- a topic would need clinical or legal judgement,
- the hub query returns fewer than 3 new candidates,
- any check in step 4 fails and the fix is not obvious.
