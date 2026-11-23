import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Brand card for social previews: the wordmark, an eyebrow line and a headline. Uses the renderer's built-in font. */
export function ogCard(opts: { eyebrow: string; title: string }) {
  const size = opts.title.length > 80 ? 54 : opts.title.length > 50 ? 64 : 76;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#053f3b", color: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <path d="M4 8a4 4 0 0 1 4-4h9l3 4h4a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" fill="#9fe0d2" />
            <path d="M14.5 12h3v4.5H22v3h-4.5V24h-3v-4.5H10v-3h4.5V12Z" fill="#053f3b" />
          </svg>
          <div style={{ fontSize: 36, fontWeight: 700 }}>The Hospital Index</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 28, color: "#9fe0d2", textTransform: "uppercase", letterSpacing: 2 }}>{opts.eyebrow}</div>
          <div style={{ fontSize: size, fontWeight: 700, lineHeight: 1.1, maxWidth: 1050 }}>{opts.title}</div>
        </div>
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.8)" }}>Hospital branches across India · sourced, dated facts</div>
      </div>
    ),
    OG_SIZE,
  );
}
