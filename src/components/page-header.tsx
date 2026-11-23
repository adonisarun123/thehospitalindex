import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

/** The white band that opens every browse page: breadcrumb, title, one line of context. */
export function PageHeader({ crumbs, title, children }: { crumbs?: Crumb[]; title: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className={`wrap pb-6 ${crumbs ? "pt-4" : "pt-8"}`}>
        {crumbs ? <Breadcrumbs items={crumbs} /> : null}
        <h1 className="h-page">{title}</h1>
        {children}
      </div>
    </div>
  );
}
