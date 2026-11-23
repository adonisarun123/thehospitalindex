import type { Listing } from "@/lib/listing";
import { ACCESS_CODES } from "@/lib/listing";
import { titleCaseEnum } from "@/lib/text";

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-3">
      <legend className="float-left mb-1 w-full font-semibold">{legend}</legend>
      <div className="clear-both flex flex-col">{children}</div>
    </fieldset>
  );
}

function Check({ name, value, label, count, checked }: { name: string; value: string; label: string; count?: number; checked: boolean }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="size-5 accent-teal" />
      <span>
        {label}
        {count !== undefined ? <span className="meta"> ({count})</span> : null}
      </span>
    </label>
  );
}

/**
 * SRH-03. A plain GET form: it works without JavaScript, produces shareable
 * URLs (NAV-03) and creates no crawlable link per permutation (§22).
 */
export function Filters({
  action,
  listing,
  show,
  idPrefix,
}: {
  /** Two copies render (rail and sheet); only one is displayed, and ids must stay unique. */
  idPrefix: string;
  action: string;
  listing: Listing;
  show: { specialty: boolean; locality: boolean };
}) {
  const { facets, selected } = listing;
  const hidden = listing.selected.q ? [["q", listing.selected.q]] : [];
  for (const k of ["where", "geo"]) {
    const v = listing.query.get(k);
    if (v) hidden.push([k, v]);
  }
  return (
    <form action={action} method="get" aria-label="Filter hospitals" className="flex flex-col gap-3">
      {hidden.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Group legend="Care">
        <Check name="emergency" value="1" label="Emergency department" checked={selected.emergency} />
        <Check name="accredited" value="1" label="Current accreditation" checked={selected.accredited} />
      </Group>
      {facets.facilityTypes.length > 0 ? (
        <Group legend="Facility type">
          {facets.facilityTypes.map((f) => (
            <Check key={f.value} name="type" value={f.value} label={titleCaseEnum(f.value)} count={f.count} checked={selected.types.includes(f.value)} />
          ))}
        </Group>
      ) : null}
      {facets.ownerships.length > 0 ? (
        <Group legend="Ownership">
          {facets.ownerships.map((f) => (
            <Check key={f.value} name="ownership" value={f.value} label={titleCaseEnum(f.value)} count={f.count} checked={selected.ownerships.includes(f.value)} />
          ))}
        </Group>
      ) : null}
      {show.specialty && facets.specialties.length > 0 ? (
        <Group legend="Department">
          {facets.specialties.map((f) => (
            <Check key={f.value} name="specialty" value={f.value} label={f.label} count={f.count} checked={selected.specialties.includes(f.value)} />
          ))}
        </Group>
      ) : null}
      {show.locality && facets.localities.length > 0 ? (
        <Group legend="Locality">
          {facets.localities.map((f) => (
            <Check key={f.value} name="locality" value={f.value} label={f.label} count={f.count} checked={selected.localities.includes(f.value)} />
          ))}
        </Group>
      ) : null}
      <Group legend="Accessibility">
        {Object.entries(ACCESS_CODES).map(([code, label]) => (
          <Check key={code} name="access" value={code} label={label} checked={selected.access.includes(code)} />
        ))}
      </Group>
      <div className="border-t border-line pt-3">
        <label htmlFor={`${idPrefix}-sort`} className="mb-1 block font-semibold">
          Sort by
        </label>
        <select id={`${idPrefix}-sort`} name="sort" defaultValue={selected.sort} className="field">
          <option value="default">{selected.q ? "Best match" : "Most complete listing"}</option>
          <option value="rating">Highest patient rating</option>
        </select>
        <p className="meta mt-1">
          <a href="/sources#sorting" className="link">
            How sorting works
          </a>
        </p>
      </div>
      <button type="submit" className="btn-primary">
        Apply filters
      </button>
    </form>
  );
}
