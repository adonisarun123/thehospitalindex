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
