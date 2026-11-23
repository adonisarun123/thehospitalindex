import "server-only";
import { cache } from "react";
import { findByAlias, getChild, getLocality, getState, type Geo } from "@/lib/queries/geo";

/** Slugs are lowercase by contract (NAV-02); anything else is not a route. */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const isSlug = (s: string) => SLUG.test(s);

export type StateResolution = { state: Geo } | { redirectStateSlug: string } | null;

export const resolveState = cache(async (slug: string): Promise<StateResolution> => {
  if (!isSlug(slug)) return null;
  const state = await getState(slug);
  if (state) return { state };
  const alias = await findByAlias(["state", "union_territory"], null, slug);
  return alias ? { redirectStateSlug: alias.slug } : null;
});

/** Resolves a child place, following a reviewed alias (bangalore → bengaluru) to its canonical slug. */
export const resolveChild = cache(
  async (kind: "district" | "settlement", stateId: string, slug: string): Promise<{ geo: Geo } | { redirectSlug: string } | null> => {
    if (!isSlug(slug)) return null;
    const geo = await getChild(kind, stateId, slug);
    if (geo) return { geo };
    const alias = await findByAlias([kind], stateId, slug);
    return alias ? { redirectSlug: alias.slug } : null;
  },
);

export const resolveLocality = cache(async (settlementId: string, slug: string) => (isSlug(slug) ? getLocality(settlementId, slug) : null));
