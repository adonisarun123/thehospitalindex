import type { HubPage } from "@/content/types";
import { hubs as week2026w48 } from "./2026-w48";

/**
 * Every reviewed hub page. Each weekly batch lives in its own file named by
 * ISO week (YYYY-wNN) so a pull request touches one new file plus this list.
 */
export const hubPages: HubPage[] = [...week2026w48];

export function hubPath(h: HubPage): string {
  const base = `/hospitals/${h.state}/${h.city}`;
  if (h.kind === "city") return base;
  return `${base}/${h.kind === "city-specialty" ? "specialty" : "service"}/${h.taxon}`;
}

const byPath = new Map(hubPages.map((h) => [hubPath(h), h]));

export const getHubPage = (path: string) => byPath.get(path);

export const hubWordCount = (h: HubPage) => h.guidance.split(/\s+/).filter(Boolean).length;
