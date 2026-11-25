import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { InitialsTile } from "@/components/branch-card";
import { ExternalIcon, PhoneIcon, PinIcon, RouteIcon, StarIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { TrustLabel, formatDate } from "@/components/trust-label";
import { displayRating } from "@/lib/gates";
import { VISIT_LABEL } from "@/lib/policy";
import { branchRelated } from "@/lib/queries/related";
import { findRedirect, getBranchCore, getBranchProfile, listReviews, type BranchCore, type Hours } from "@/lib/queries/profile";
import { abs, breadcrumbLd, hospitalLd } from "@/lib/schema-org";
import { titleCaseEnum } from "@/lib/text";
import { parseBranchParam, urls } from "@/lib/urls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/**
 * NAV-02: the suffix identifies the branch; the readable part may change.
 * A stale name redirects to the current address in one permanent hop.
 */
const load = cache(async (param: string) => {
  const parsed = parseBranchParam(param);
  if (!parsed) return { kind: "missing" } as const;
  const core = await getBranchCore(parsed.publicId);
  if (!core) {
    const r = await findRedirect(`/hospital/${param}`);
    return r?.targetPath ? ({ kind: "redirect", to: r.targetPath } as const) : ({ kind: "missing" } as const);
  }
  if (parsed.slug !== core.slug) return { kind: "redirect", to: urls.branch(core.slug, core.publicId) } as const;
  const [profile, reviews, related] = await Promise.all([
    getBranchProfile(core.id),
    listReviews(core.id, { limit: 10 }),
    branchRelated(core.id),
  ]);
  return { kind: "ok", core, profile, related, reviews: reviews ?? { items: [], next: null } } as const;
});

async function run(props: Props) {
  const { slug } = await props.params;
  const r = await load(slug);
  if (r.kind === "redirect") permanentRedirect(r.to);
  if (r.kind === "missing") notFound();
  return r;
}

const fullName = (b: BranchCore) => (b.branchQualifier ? `${b.displayName}, ${b.branchQualifier}` : b.displayName);

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { core, profile } = await run(props);
  const where = [core.locality?.name, core.settlement.name].filter(Boolean).join(", ");
  const depts = [...new Set(profile.offerings.filter((o) => o.kind === "specialty").map((o) => o.name))].slice(0, 4);
  return {
    title: `${fullName(core)}: Services and Patient Reviews`,
    description: `${fullName(core)} in ${where}, ${core.state.name}.${
      depts.length ? ` Departments include ${depts.join(", ")}.` : ""
    } Check services, contact details and where each fact came from.`,
    alternates: { canonical: abs(urls.branch(core.slug, core.publicId)) },
    robots: { index: core.isIndexable && core.status === "published", follow: true },
  };
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ROLE_LABEL: Record<string, string> = {
  switchboard: "Switchboard",
  opd: "OPD",
  admissions: "Admissions",
  emergency: "Emergency",
  ambulance: "Ambulance",
  tpa_desk: "Insurance (TPA) desk",
  patient_relations: "Patient relations",
  email: "Email",
  website: "Official website",
  contact_page: "Contact page",
  appointment_url: "Appointments (official)",
};
const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const hoursText = (h: Hours) =>
  h.isClosed ? "Closed" : h.is24h ? "Open 24 hours" : `${h.opens}–${h.closes}${h.crossesMidnight ? " (next day)" : ""}`;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="card mt-6 scroll-mt-24 p-5 sm:p-6">
      <h2 id={`${id}-h`} className="h-section">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function BranchPage(props: Props) {
  const { core: b, profile: p, reviews, related } = await run(props);
  const name = fullName(b);
  const self = urls.branch(b.slug, b.publicId);
  const crumbs: Crumb[] = [
    { name: "Hospitals in India", href: urls.country() },
    { name: b.state.name, href: urls.state(b.state.slug) },
    { name: b.settlement.name, href: urls.city(b.state.slug, b.settlement.slug) },
    { name, href: self },
  ];

  const closed = b.status === "permanently_closed" || b.status === "temporarily_closed";
  const phones = p.contacts.filter((c) => !["website", "contact_page", "appointment_url", "email"].includes(c.role));
  const mainPhone = closed ? undefined : phones.find((c) => c.status === "checked_against_source" && ["switchboard", "opd", "admissions"].includes(c.role));
  const website = p.contacts.find((c) => c.role === "website" && c.status === "checked_against_source");
  const canDirect = b.lat !== null && b.lng !== null && ["rooftop", "street"].includes(b.coordPrecision);
  const rating = displayRating(b.ratingSum, b.reviewCount);

  const departments = p.offerings.filter((o) => o.kind === "specialty");
  // Department links stay local when the city hub for that department can be indexed.
  const cityHubSlugs = new Set(related.cityHubs.filter((h) => h.kind === "specialty").map((h) => h.slug));
  const deptHref = (slug: string) =>
    cityHubSlugs.has(slug) ? urls.citySpecialty(b.state.slug, b.settlement.slug, slug) : urls.specialty(slug);
  const deptSlugs = new Set(departments.map((d) => d.slug));
  const similarCare = related.cityHubs.filter((h) => h.kind === "specialty" && deptSlugs.has(h.slug)).slice(0, 8);
  const services = p.offerings.filter((o) => o.kind === "service");
  const accessibility = p.amenities.filter((a) => a.category === "accessibility");
  const otherAmenities = p.amenities.filter((a) => a.category !== "accessibility");
  const hoursByPurpose = Map.groupBy(p.hours, (h) => h.purpose);
  const hasServices = departments.length + services.length > 0;
  const hasPeople = p.clinicians.length + p.capacity.length + p.credentials.length > 0;

  // PRO-01: empty optional sections and their anchors are omitted.
  const anchors = [
    ["overview", "Overview"],
    ...(hasServices ? [["services", "Services"]] : []),
    ["reviews", "Patient reviews"],
    ["visit", "Visitor information"],
  ];

  return (
    <article className="pb-24 lg:pb-0">
      <JsonLd data={breadcrumbLd(crumbs)} />
      {b.status === "published" ? <JsonLd data={hospitalLd(b, p)} /> : null}

      <div className="border-b border-line bg-surface">
        <div className="wrap pt-4 pb-6">
          <Breadcrumbs items={crumbs} />
          {closed || b.status === "disputed" ? (
            <p role="status" className="mb-4 rounded-xl border border-error bg-error-tint p-4 font-semibold text-error">
              <span aria-hidden="true">! </span>
              {b.status === "permanently_closed"
                ? "This branch is recorded as permanently closed."
                : b.status === "temporarily_closed"
                  ? "This branch is recorded as temporarily closed."
                  : "Some details of this branch are under review."}
              {b.statusReason ? <span className="font-normal"> {b.statusReason}</span> : null}
            </p>
          ) : null}
          <header className="flex gap-4 sm:gap-5">
            <InitialsTile name={b.displayName} size="lg" />
            <div className="min-w-0">
              <h1 className="h-page [overflow-wrap:anywhere]">{b.displayName}</h1>
              {b.branchQualifier ? <p className="display mt-1 text-xl font-bold text-teal-dark">{b.branchQualifier} branch</p> : null}
              <p className="mt-2 flex items-start gap-1.5 text-lg">
                <PinIcon className="mt-1 shrink-0 text-muted" />
                {[b.locality?.name, b.settlement.name, b.state.name].filter(Boolean).join(", ")}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                <li className="chip">{titleCaseEnum(b.facilityType)}</li>
                {b.ownership ? <li className="chip">{titleCaseEnum(b.ownership)}</li> : null}
                {b.orgName ? <li className="chip">Part of {b.orgName} (network)</li> : null}
                {b.hasEmergency === "yes" && b.emergencyIsCurrent ? (
                  <li className="chip border-teal bg-teal-tint font-semibold text-teal-dark">Emergency department</li>
                ) : null}
              </ul>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                {rating ? (
                  <a href="#reviews" className="flex items-center gap-2 text-ink no-underline">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1 text-lg font-bold text-white">
                      <StarIcon className="size-4" />
                      {rating}
                      <span className="sr-only"> out of 5</span>
                    </span>
                    <span className="underline underline-offset-4">
                      {b.reviewCount} patient {b.reviewCount === 1 ? "review" : "reviews"}
                    </span>
                    <span className="meta">{VISIT_LABEL}</span>
                  </a>
                ) : (
                  <span className="meta text-base">No patient reviews here yet</span>
                )}
                {b.lastCheckedAt ? <span className="meta">Listing last checked {formatDate(b.lastCheckedAt)}</span> : null}
              </p>
            </div>
          </header>
        </div>
        <nav aria-label="On this page" className="wrap overflow-x-auto">
          <ul className="flex gap-1 whitespace-nowrap">
            {anchors.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-12 items-center border-b-2 border-transparent px-3 font-semibold text-ink hover:border-teal hover:text-teal-dark">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="wrap grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <aside aria-label="Contact and location" className="mt-6 lg:order-2">
          <div className="card p-5 lg:sticky lg:top-20">
            <h2 className="display text-lg font-bold">Contact this branch</h2>
            {mainPhone || canDirect || website ? (
              <div className="mt-3 flex flex-col gap-2">
                {mainPhone ? (
                  <a href={`tel:${mainPhone.value}`} className="btn-primary">
                    <PhoneIcon className="size-4" />
                    Call {mainPhone.isShared ? "network switchboard" : "hospital"}
                  </a>
                ) : null}
                {canDirect ? (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`} rel="noopener nofollow" className="btn-quiet">
                    <RouteIcon className="size-4" />
                    Get directions<span className="sr-only"> (opens Google Maps)</span>
                  </a>
                ) : null}
                {website ? (
                  <a href={website.value} rel="noopener nofollow" className="btn-quiet">
                    Official website
                    <ExternalIcon />
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-2">{closed ? "Contact actions are removed for closed branches." : "No checked contact route is published yet."}</p>
            )}
            <dl className="mt-5 space-y-4 border-t border-line pt-4">
              <div>
                <dt className="font-semibold">Address</dt>
                <dd>
                  {[b.addressLine1, b.addressLine2, b.locality?.name, b.settlement.name, b.state.name].filter(Boolean).join(", ")}
                  {b.pincode ? ` ${b.pincode}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Emergency department</dt>
                <dd>
                  {b.hasEmergency === "yes" ? `Yes${b.emergency24h === "yes" ? ", open 24 hours" : ""}` : b.hasEmergency === "no" ? "No" : "Contact hospital to confirm"}
                  {b.hasEmergency === "yes" && b.emergencyCheckedAt ? <span className="meta block">Last confirmed {formatDate(b.emergencyCheckedAt)}</span> : null}
                </dd>
              </div>
            </dl>
            <p className="meta mt-4 border-t border-line pt-4">
              Something wrong?{" "}
              <Link href={`/corrections?branch=${b.publicId}`} rel="nofollow" className="link">
                Suggest a correction
              </Link>
            </p>
          </div>
        </aside>

        <div className="min-w-0 lg:order-1">
      <Section id="overview" title="Overview">
        {b.overview ? <p className="max-w-3xl">{b.overview}</p> : null}
        <dl className={`grid gap-4 sm:grid-cols-2 ${b.overview ? "mt-5" : ""}`}>
          <div>
            <dt className="font-semibold">Emergency department</dt>
            <dd>
              {/* PRO-03: emergency is its own fact; "24-hour" appears only with branch-specific evidence. */}
              {b.hasEmergency === "yes" ? (
                <>
                  Yes{b.emergency24h === "yes" ? ", open 24 hours" : ""}
                  <span className="meta block">
                    {b.emergencyCheckedAt ? `Last confirmed ${formatDate(b.emergencyCheckedAt)}. ` : ""}
                    {b.emergencyIsCurrent ? "Call to confirm before travelling." : "This is overdue for a recheck: call the hospital to confirm."}
                  </span>
                </>
              ) : b.hasEmergency === "no" ? (
                "No emergency department at this branch"
              ) : (
                "Contact hospital to confirm"
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Address</dt>
            <dd>
              {[b.addressLine1, b.addressLine2, b.locality?.name, b.settlement.name, b.district ? `${b.district.name} district` : null, b.state.name]
                .filter(Boolean)
                .join(", ")}
              {b.pincode ? ` ${b.pincode}` : ""}
              {b.landmark ? <span className="meta block">Landmark: {b.landmark}</span> : null}
            </dd>
          </div>
        </dl>
        {p.hasConflicts ? (
          <p className="meta mt-4">Sources disagree on at least one detail of this branch. We are rechecking it and show only what is confirmed.</p>
        ) : null}
      </Section>

      {hasServices ? (
        <Section id="services" title="Services and specialties">
          {departments.length ? (
            <>
              <h3 className="text-lg font-semibold">Departments</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {departments.map((o) => (
                  <li key={`${o.slug}-${o.careSetting}`}>
                    <Link href={deptHref(o.slug)} className="link font-medium">
                      {o.name}
                    </Link>
                    {o.plainLabel ? <span className="meta"> ({o.plainLabel})</span> : null}
                    {o.careSetting !== "unspecified" ? <span className="meta"> · {titleCaseEnum(o.careSetting)}</span> : null}
                    <div>
                      <TrustLabel status={o.status} checkedAt={o.lastCheckedAt} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="meta mt-3">A department listing does not confirm that a particular procedure is offered. Check the services below or ask the hospital.</p>
            </>
          ) : null}
          {services.length ? (
            <>
              <h3 className={`text-lg font-semibold ${departments.length ? "mt-6" : ""}`}>Services, diagnostics and support</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {services.map((o) => (
                  <li key={`${o.slug}-${o.careSetting}`}>
                    <span className="font-medium">{o.name}</span>
                    {o.availability !== "unknown" ? <span className="meta"> · {titleCaseEnum(o.availability)}</span> : null}
                    {o.appointmentNote ? <span className="meta block">{o.appointmentNote}</span> : null}
                    <div>
                      <TrustLabel status={o.status} checkedAt={o.lastCheckedAt} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Section>
      ) : null}

      {hasPeople ? (
        <Section id="facilities" title="People and facilities">
          {p.credentials.length ? (
            <>
              <h3 className="text-lg font-semibold">Accreditation and registration</h3>
              <ul className="mt-2 space-y-3">
                {p.credentials.map((c) => (
                  <li key={`${c.issuer}-${c.programme}`}>
                    <span className="font-medium">
                      {c.issuer}: {c.programme}
                      {c.level ? ` (${c.level})` : ""}
                    </span>
                    <span className="meta block">
                      {titleCaseEnum(c.category)}
                      {c.scope ? ` · Scope: ${c.scope}` : ""}
                      {c.expiresOn ? ` · Valid until ${formatDate(c.expiresOn)}` : ""}
                    </span>
                    <TrustLabel status={c.status} checkedAt={c.lastCheckedAt} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {p.capacity.length ? (
            <>
              <h3 className={`text-lg font-semibold ${p.credentials.length ? "mt-6" : ""}`}>Installed capacity</h3>
              <ul className="mt-2 space-y-2">
                {p.capacity.map((c) => (
                  <li key={c.metric}>
                    <span className="font-medium">
                      {titleCaseEnum(c.metric)}: {c.value}
                    </span>
                    <span className="meta"> · as of {formatDate(c.asOf)}</span> <TrustLabel status={c.status} />
                  </li>
                ))}
              </ul>
              <p className="meta mt-2">Installed capacity is not live bed availability. Call the hospital to check.</p>
            </>
          ) : null}
          {p.clinicians.length ? (
            <>
              <h3 className="mt-6 text-lg font-semibold">Consultants</h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {p.clinicians.map((c) => (
                  <li key={c.name}>
                    {c.doctorIndexUrl ? (
                      <a href={c.doctorIndexUrl} className="link font-medium">
                        {c.name}
                      </a>
                    ) : (
                      <span className="font-medium">{c.name}</span>
                    )}
                    <span className="meta block">{[c.designation, c.department].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Section>
      ) : null}

      <Section id="reviews" title="Patient experiences">
        {rating ? (
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <div>
              <p className="text-4xl font-bold">
                {rating}
                <span className="meta text-base font-normal"> out of 5</span>
              </p>
              <p className="meta">
                {b.reviewCount} patient {b.reviewCount === 1 ? "review" : "reviews"}
                {b.reviewCount < 5 ? " · small sample" : ""}
              </p>
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">Number of reviews by star rating</caption>
                <tbody>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <tr key={n}>
                      <th scope="row" className="w-14 py-0.5 text-left font-normal">
                        {n} star
                      </th>
                      <td>
                        <div className="h-2 rounded bg-line" aria-hidden="true">
                          <div className="h-2 rounded bg-teal" style={{ width: `${(b.histogram[n - 1] / b.reviewCount) * 100}%` }} />
                        </div>
                      </td>
                      <td className="w-8 pl-2 text-right">{b.histogram[n - 1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-4">
              {reviews.items.map((r) => (
                <li key={r.id} className="border-b border-line pb-4 last:border-0">
                  <p className="font-semibold">
                    <span aria-hidden="true">{"★".repeat(r.overall)}{"☆".repeat(5 - r.overall)} </span>
                    <span className="sr-only">{r.overall} out of 5. </span>
                    {r.pseudonym}
                  </p>
                  <p className="meta">
                    <Link href="/how-reviews-work" className="rounded-full bg-teal-tint px-2 py-0.5 font-medium text-teal-dark no-underline">
                      ✓ {VISIT_LABEL}
                    </Link>{" "}
                    {r.visitType ? `· ${r.visitType} visit ` : ""}· Published {formatDate(r.publishedAt)}
                  </p>
                  <p className="mt-2 max-w-3xl">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="font-semibold">No patient reviews here yet.</p>
        )}
        <p className="meta mt-4 max-w-3xl">
          “{VISIT_LABEL}” means our team matched a hospital bill or prescription and a contact number to a visit at this branch. A review
          records one patient’s experience. It is not a certification of clinical quality.{" "}
          <Link href="/how-reviews-work" className="link">
            How reviews work
          </Link>
          . Review submission opens with the verified-review release.
        </p>

        {p.sourceLinks.length ? (
          <div className="mt-6 border-t border-line pt-4">
            <h3 className="text-lg font-semibold">Reviews on other sites</h3>
            <p className="meta">
              These links go to this branch’s page on another platform. Their scores are not shown or counted here.
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-6">
              {p.sourceLinks.map((l) => (
                <li key={l.code}>
                  <a href={l.url} rel="noopener nofollow" className="link inline-flex min-h-11 items-center">
                    Reviews on {l.provider}
                    <span className="sr-only"> (external site)</span>
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section id="visit" title="Planning a visit">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">Contact</h3>
            {p.contacts.length && !closed ? (
              <ul className="mt-2 space-y-3">
                {p.contacts.map((c) => {
                  const isUrl = c.value.startsWith("https://");
                  const href = isUrl ? c.value : c.role === "email" ? `mailto:${c.value}` : `tel:${c.value}`;
                  return (
                    <li key={`${c.role}-${c.value}`}>
                      <span className="font-medium">{c.label ?? ROLE_LABEL[c.role] ?? titleCaseEnum(c.role)}: </span>
                      <a href={href} className="link" rel={isUrl ? "noopener nofollow" : undefined}>
                        {isUrl ? new URL(c.value).hostname : c.value}
                      </a>
                      {c.isShared ? <span className="meta"> (shared across branches)</span> : null}
                      <div>
                        <TrustLabel status={c.status} checkedAt={c.lastCheckedAt} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2">{closed ? "Contact actions are removed for closed branches." : "No checked contact details are published yet."}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold">Hours</h3>
            {hoursByPurpose.size ? (
              [...hoursByPurpose.entries()].map(([purpose, rows]) => (
                <table key={purpose} className="mt-2 w-full max-w-sm text-left">
                  <caption className="text-left font-medium">
                    {purpose === "opd" ? "OPD" : titleCaseEnum(purpose)}{" "}
                    <TrustLabel status={rows[0].status} checkedAt={rows[0].lastCheckedAt} />
                  </caption>
                  <tbody>
                    {rows.map((h, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <th scope="row" className="py-1.5 pr-4 font-normal">
                          {WEEKDAYS[h.weekday]}
                        </th>
                        <td className="py-1.5">{hoursText(h)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))
            ) : (
              <p className="mt-2">Contact hospital to confirm opening hours.</p>
            )}
          </div>

          {accessibility.length + otherAmenities.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold">Accessibility and amenities</h3>
              <ul className="mt-2 space-y-1.5">
                {[...accessibility, ...otherAmenities].map((a) => (
                  <li key={a.code}>
                    <span aria-hidden="true">{a.state === "yes" ? "✓" : "✕"} </span>
                    {titleCaseEnum(a.code)}: <span className="font-medium">{a.state === "yes" ? "Yes" : "No"}</span>
                    {a.note ? <span className="meta"> · {a.note}</span> : null}
                  </li>
                ))}
              </ul>
              <p className="meta mt-2">
                <TrustLabel status={(accessibility[0] ?? otherAmenities[0]).status} /> Features not listed are unknown, not unavailable.
              </p>
            </div>
          ) : null}

          {p.payers.length ? (
            <div>
              <h3 className="text-lg font-semibold">Insurance and schemes</h3>
              <ul className="mt-2 space-y-3">
                {p.payers.map((y) => (
                  <li key={`${y.payerName}-${y.mode}`}>
                    <span className="font-medium">{y.payerName}</span>
                    {y.plan ? ` (${y.plan})` : ""} <span className="meta">· {titleCaseEnum(y.mode)}</span>
                    <div>
                      <TrustLabel status={y.status} checkedAt={y.lastCheckedAt} />
                      {!y.isCurrent ? <span className="meta"> · overdue for a recheck</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="meta mt-2">Eligibility depends on the patient, the plan and the procedure. Confirm with the hospital’s insurance desk and your insurer.</p>
            </div>
          ) : null}

          {p.prices.length ? (
            <div>
              <h3 className="text-lg font-semibold">Indicative charges</h3>
              <ul className="mt-2 space-y-3">
                {p.prices.map((c) => (
                  <li key={c.label}>
                    <span className="font-medium">{c.label}: </span>
                    {c.minPaise !== null && c.maxPaise !== null && c.maxPaise !== c.minPaise
                      ? `${rupees(c.minPaise)}–${rupees(c.maxPaise)}`
                      : rupees((c.minPaise ?? c.maxPaise)!)}
                    <span className="meta block">
                      {c.context ? `${c.context} · ` : ""}as published on {formatDate(c.sourceDate)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="meta mt-2">Indicative figures only. This is not a quote; ask the billing desk for current charges.</p>
            </div>
          ) : null}
        </div>
      </Section>

      <Section id="sources" title="Sources and corrections">
        {p.sources.length ? (
          <ul className="space-y-2">
            {p.sources.map((s) => (
              <li key={`${s.name}-${s.observedAt}`}>
                {s.url ? (
                  <a href={s.url} rel="noopener nofollow" className="link">
                    {s.name}
                  </a>
                ) : (
                  s.name
                )}
                <span className="meta"> · {titleCaseEnum(s.kind)} · observed {formatDate(s.observedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Facts on this page were supplied by the hospital and are labelled where shown.</p>
        )}
        <p className="mt-4">
          Seen something wrong?{" "}
          <Link href={`/corrections?branch=${b.publicId}`} rel="nofollow" className="link">
            Suggest a correction
          </Link>
          . Hospitals can propose changes; our editors decide what is published.{" "}
          <Link href="/sources" className="link">
            How we source and label facts
          </Link>
          .
        </p>
      </Section>

          {related.nearby.length || related.siblings.length || similarCare.length ? (
            <Section id="related" title={`More hospitals near ${b.locality?.name ?? b.settlement.name}`}>
              <div className="grid gap-6 md:grid-cols-2">
                {related.nearby.length ? (
                  <nav aria-labelledby="nearby-h">
                    <h3 id="nearby-h" className="text-lg font-semibold">
                      Other hospitals in {b.settlement.name}
                    </h3>
                    <ul className="mt-2">
                      {related.nearby.map((n) => (
                        <li key={n.publicId}>
                          <Link href={urls.branch(n.slug, n.publicId)} className="link inline-flex min-h-11 items-center font-medium">
                            {n.name}
                          </Link>
                          <span className="meta"> · {n.place}</span>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
                {similarCare.length ? (
                  <nav aria-labelledby="similar-h">
                    <h3 id="similar-h" className="text-lg font-semibold">
                      Compare by department in {b.settlement.name}
                    </h3>
                    <ul className="mt-2">
                      {similarCare.map((h) => (
                        <li key={h.slug}>
                          <Link href={urls.citySpecialty(b.state.slug, b.settlement.slug, h.slug)} className="link inline-flex min-h-11 items-center">
                            {h.name} hospitals in {b.settlement.name}
                          </Link>{" "}
                          <span className="meta">({h.published})</span>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
                {related.siblings.length ? (
                  <nav aria-labelledby="siblings-h">
                    <h3 id="siblings-h" className="text-lg font-semibold">
                      Other branches of this hospital group
                    </h3>
                    <ul className="mt-2">
                      {related.siblings.map((n) => (
                        <li key={n.publicId}>
                          <Link href={urls.branch(n.slug, n.publicId)} className="link inline-flex min-h-11 items-center font-medium">
                            {n.name}
                          </Link>
                          <span className="meta"> · {n.place}</span>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
              </div>
            </Section>
          ) : null}
          <p className="mt-6 flex flex-wrap gap-3">
            <Link href={urls.city(b.state.slug, b.settlement.slug)} className="btn-quiet">
              More hospitals in {b.settlement.name}
            </Link>
            {b.district ? (
              <Link href={urls.district(b.state.slug, b.district.slug)} className="btn-quiet">
                Hospitals in {b.district.name} district
              </Link>
            ) : null}
          </p>
        </div>
      </div>

      {/* MOB-01: checked contact actions within thumb reach on small screens. */}
      {mainPhone || canDirect ? (
        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-surface p-3 shadow-(--shadow-lift) lg:hidden">
          {mainPhone ? (
            <a href={`tel:${mainPhone.value}`} className="btn-primary flex-1">
              <PhoneIcon className="size-4" />
              Call
            </a>
          ) : null}
          {canDirect ? (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`} rel="noopener nofollow" className="btn-quiet flex-1">
              <RouteIcon className="size-4" />
              Directions
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
