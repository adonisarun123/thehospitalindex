/**
 * Editorial content (blog posts, glossary, FAQ) lives in typed modules rather
 * than the database: it is reviewed in pull requests, versioned with the code
 * and rendered statically. Inline text supports two marks only:
 *   [link text](/path or https://…)   and   **bold**
 */

export type Block =
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; tone: "info" | "warning"; title?: string; text: string };

export type Source = { title: string; publisher: string; url: string };

export type Faq = { q: string; a: string };

export type Category = "Choosing care" | "Insurance and costs" | "Patient rights" | "Emergencies" | "Using this directory";

export type Post = {
  slug: string;
  title: string;
  /** Meta description: 120–160 characters. */
  description: string;
  /** One or two sentences for cards and the RSS feed. */
  excerpt: string;
  category: Category;
  keywords: string[];
  /** ISO dates (YYYY-MM-DD). `factsCheckedOn` is when every sourced claim was last compared with its source. */
  datePublished: string;
  dateModified: string;
  factsCheckedOn: string;
  /** Short answer shown above the body: the post's main point in two or three sentences. */
  summary: string;
  body: Block[];
  faqs?: Faq[];
  /** Primary sources for regulatory or numerical claims. Shown on the page and emitted as `citation`. */
  sources: Source[];
  related: string[];
};

/**
 * Landing copy for a listing hub (city, or city × specialty/service). The
 * module in the repo is the source of truth; merging it to `main` is the
 * editorial review. `scripts/sync-hub-content.ts` copies `guidance` into the
 * database on production builds, which is what makes the hub indexable
 * (SEO-01). FAQs and sources render from this module.
 */
export type HubPage = {
  kind: "city" | "city-specialty" | "city-service";
  /** Slugs as they appear in the URL. `taxon` is required unless kind is "city". */
  state: string;
  city: string;
  taxon?: string;
  /** Plain text, no marks, one paragraph, 90–220 words. Shown above the listing. */
  guidance: string;
  /** 3–6 questions people actually ask about this hub; answers may use inline marks. */
  faqs: Faq[];
  sources: Source[];
  datePublished: string;
  factsCheckedOn: string;
};
