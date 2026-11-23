import { posts } from "@/content/blog";
import { SITE_NAME, SITE_URL } from "@/lib/env";

export const dynamic = "force-static";

/** llms.txt (llmstxt.org): a plain map of the site for AI assistants and answer engines. */
export function GET() {
  const u = (p: string) => `${SITE_URL}${p}`;
  const body = `# ${SITE_NAME}

> A directory of physical hospital branches across India. Each profile describes one branch at one address. Every important fact carries a label saying who supplied it ("Hospital supplied" or "Checked against source") and when it was last checked. Patient reviews are published only after visit evidence for that branch is checked. The site gives no medical advice and does not rank hospitals by clinical outcomes.

## Directory
- [Browse by state](${u("/hospitals")}): states, cities, districts and localities
- [Specialties](${u("/specialties")}): hospitals by medical specialty
- [Search](${u("/search")}): search by hospital, specialty or service
- [Directory coverage](${u("/coverage")}): how many branches are published per state

## How the data works
- [Sources, trust labels and sorting](${u("/sources")})
- [How patient reviews work](${u("/how-reviews-work")})
- [Editorial policy](${u("/editorial-policy")})
- [About](${u("/about")})
- [Medical disclaimer](${u("/medical-disclaimer")})

## Guides
${posts.map((p) => `- [${p.title}](${u(`/blog/${p.slug}`)}): ${p.excerpt}`).join("\n")}

## Reference
- [Glossary of hospital terms](${u("/glossary")})
- [Frequently asked questions](${u("/faq")})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
