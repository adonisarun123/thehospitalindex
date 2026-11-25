/** Decorative line icons for specialty tiles. The tile's text always carries the meaning. */
const PATHS: Record<string, string> = {
  cardiology: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z",
  "emergency-medicine": "M12 5v14M5 12h14",
  paediatrics: "M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21v-5a6 6 0 0 1 12 0v5",
  "obstetrics-and-gynaecology": "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13v8M9 18h6",
  orthopaedics: "M8 4a2 2 0 1 0-2 3l9 9a2 2 0 1 0 3 2 2 2 0 1 0 0-3L9 6a2 2 0 0 0-1-2Z",
  nephrology: "M9 4c-4 2-4 12 0 16 2-2 2-4 2-8s0-6-2-8ZM15 4c4 2 4 12 0 16-2-2-2-4-2-8s0-6 2-8Z",
  oncology: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v8M8 12h8",
  "general-medicine": "M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2M20 14a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  "general-surgery": "M4 20 14 10M14 10l4-6 2 2-6 4ZM7 17l-3 3",
  neurology: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1V5a3 3 0 0 0-3-1ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 5 3 3 0 0 1-5 1",
  gastroenterology: "M8 3v5a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4 5 5 0 0 1-5 5H9",
  urology: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z",
};
const FALLBACK = "M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4Z";

export function SpecialtyIcon({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[slug] ?? FALLBACK} />
    </svg>
  );
}
