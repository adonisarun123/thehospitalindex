/**
 * URL contracts (SRS §03). Lowercase slugs, no trailing slash, and the
 * reserved segments `district`, `locality`, `specialty`, `service`.
 */
export const urls = {
  home: () => "/",
  country: () => "/hospitals",
  state: (state: string) => `/hospitals/${state}`,
  city: (state: string, city: string) => `/hospitals/${state}/${city}`,
  district: (state: string, district: string) => `/hospitals/${state}/district/${district}`,
  locality: (state: string, city: string, locality: string) => `/hospitals/${state}/${city}/locality/${locality}`,
  citySpecialty: (state: string, city: string, specialty: string) =>
    `/hospitals/${state}/${city}/specialty/${specialty}`,
  cityService: (state: string, city: string, service: string) => `/hospitals/${state}/${city}/service/${service}`,
  specialties: () => "/specialties",
  specialty: (specialty: string) => `/specialties/${specialty}`,
  branch: (slug: string, publicId: string) => `/hospital/${slug}-${publicId}`,
  search: (params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/search?${s}` : "/search";
  },
};

/** Splits `sampige-community-hospital-h7k2m9` into its readable slug and stable suffix. */
export function parseBranchParam(param: string): { slug: string; publicId: string } | null {
  const m = /^(?:(.*)-)?([a-z0-9]{6,12})$/.exec(param);
  if (!m) return null;
  return { slug: m[1] ?? "", publicId: m[2] };
}

/** Page 1 uses the base URL; page 2 onward has its own URL (§22). */
export function withPage(base: string, query: URLSearchParams, page: number): string {
  const qs = new URLSearchParams(query);
  if (page <= 1) qs.delete("page");
  else qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}
