import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /**
   * Cache Components / partial prerendering are deliberately OFF.
   * With them, a dynamic route sends its shell with 200 before the data
   * resolves, so notFound() and permanentRedirect() can no longer change the
   * status. SRS §22 needs real 404s and one-hop 308s on every directory URL.
   */
  cacheComponents: false,
  /** SEO-05: metadata, canonical and robots are always in the initial HTML, for every user agent. */
  htmlLimitedBots: /.*/,
  /** NAV-02: no trailing slash; Next issues a 308 from the slashed form. */
  trailingSlash: false,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
