import { z } from "zod";
import { cardDto } from "@/lib/api/dto";
import { badRequest, handler, notFound, ok } from "@/lib/api/respond";
import { ACCESS_CODES, FACILITY_TYPES, OWNERSHIPS } from "@/lib/listing";
import { POLICY } from "@/lib/policy";
import { listBranches, listFacets, type ListFilters } from "@/lib/queries/branches";
import { getGeoById } from "@/lib/queries/geo";

const MAX_ARRAY = 10;
const ids = z.array(z.uuid()).max(MAX_ARRAY);
const Query = z
  .object({
    geography: z.uuid().optional(),
    q: z.string().trim().min(1).max(120).optional(),
    specialty: ids.optional(),
    service: ids.optional(),
    type: z.array(z.enum(FACILITY_TYPES)).max(MAX_ARRAY).optional(),
    ownership: z.array(z.enum(OWNERSHIPS)).max(MAX_ARRAY).optional(),
    access: z.array(z.enum(Object.keys(ACCESS_CODES) as [string, ...string[]])).max(MAX_ARRAY).optional(),
    emergency: z.literal("1").optional(),
    accredited: z.literal("1").optional(),
    sort: z.enum(["default", "rating"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    pageSize: z.coerce.number().int().min(1).optional(),
  })
  .strict();
const ARRAY_KEYS = new Set(["specialty", "service", "type", "ownership", "access"]);

/**
 * §27 GET /hospitals. Unknown fields are rejected with 400, filter arrays are
 * capped, page size is clamped to 50, and an empty result is an empty list.
 */
export const GET = handler(async (req) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) raw[key] = ARRAY_KEYS.has(key) ? sp.getAll(key) : sp.getAll(key).length > 1 ? sp.getAll(key) : sp.get(key)!;
  const parsed = Query.safeParse(raw);
  if (!parsed.success) return badRequest(req, "Unsupported or invalid query parameter.", z.flattenError(parsed.error).fieldErrors as never);
  const p = parsed.data;

  let scope: ListFilters["scope"];
  if (p.geography) {
    const geo = await getGeoById(p.geography);
    if (!geo) return notFound(req, "Unknown geography.");
    scope =
      geo.kind === "district" ? { districtId: geo.id }
      : geo.kind === "settlement" ? { settlementId: geo.id }
      : geo.kind === "locality" ? { localityId: geo.id }
      : { stateId: geo.id };
  }
  const filters: ListFilters = {
    scope,
    q: p.q,
    specialtyIds: p.specialty,
    serviceIds: p.service,
    facilityTypes: p.type,
    ownerships: p.ownership,
    accessCodes: p.access,
    emergency: p.emergency === "1",
    accredited: p.accredited === "1",
    sort: p.sort ?? "default",
    page: p.page ?? 1,
    pageSize: Math.min(p.pageSize ?? POLICY.pageSize, POLICY.maxApiPageSize),
  };
  const [result, facets] = await Promise.all([listBranches(filters), listFacets(filters)]);
  if (result.outOfRange) return badRequest(req, "page is beyond the last page of results.", { page: `max ${result.pageCount}` });
  return ok(req, {
    items: result.items.map(cardDto),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    next: result.page < result.pageCount ? result.page + 1 : null,
    facets: { facilityType: facets.facilityTypes, ownership: facets.ownerships, specialty: facets.specialties },
  });
});
