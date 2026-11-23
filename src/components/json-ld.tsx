/** SCH-04: generated server-side from the same projection as the UI, escaped for safe embedding. */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
