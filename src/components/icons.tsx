/** Small inline icons. Always decorative: the adjacent text carries the meaning. */
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
type P = { className?: string };

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.500C5 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const PhoneIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);
export const RouteIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m3 11 18-8-8 18-2-8-8-2Z" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.500 4.500 4.500L19 7.500" />
  </svg>
);
export const ChevronIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const StarIcon = (p: P) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="m12 3 2.700 5.700 6.300.800-4.600 4.300 1.200 6.200L12 17l-5.600 3 1.200-6.200L3 9.500l6.300-.800L12 3Z" />
  </svg>
);
export const ExternalIcon = (p: P) => (
  <svg {...base} width={16} height={16} {...p}>
    <path d="M14 5h5v5M19 5l-8 8M11 7H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" />
  </svg>
);
export const MenuIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

/** The wordmark's mark: an index tab with a cross cut out of it. */
export const Mark = ({ className }: P) => (
  <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className={className}>
    <path d="M4 8a4 4 0 0 1 4-4h9l3 4h4a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" fill="currentColor" />
    <path d="M14.500 12h3v4.500H22v3h-4.500V24h-3v-4.500H10v-3h4.500V12Z" fill="#fff" />
  </svg>
);
