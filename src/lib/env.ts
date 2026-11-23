/** Server-only configuration. Nothing here may be imported by a client component. */
import "server-only";

export const SITE_URL = (process.env.SITE_URL ?? "https://thehospitalindex.com").replace(/\/$/, "");
export const SITE_NAME = "The Hospital Index";

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  return url;
}
