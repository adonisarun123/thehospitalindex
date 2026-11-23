import "server-only";
import { NextResponse } from "next/server";

/** API-01: one stable error shape with a code, a user message and a retry hint. */
export type ApiError = { code: string; message: string; retry: "no" | "later" | "after_fix"; fields?: Record<string, string> };

export function correlationId(req: Request): string {
  const given = req.headers.get("x-correlation-id");
  return given && /^[A-Za-z0-9_-]{8,64}$/.test(given) ? given : crypto.randomUUID();
}

export function ok(req: Request, body: unknown, init: { status?: number; cache?: string } = {}) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { "x-correlation-id": correlationId(req), "cache-control": init.cache ?? "public, max-age=0, s-maxage=60" },
  });
}

export function fail(req: Request, status: number, error: ApiError) {
  return NextResponse.json({ error }, { status, headers: { "x-correlation-id": correlationId(req), "cache-control": "no-store" } });
}

export const badRequest = (req: Request, message: string, fields?: Record<string, string>) =>
  fail(req, 400, { code: "invalid_request", message, retry: "after_fix", fields });
export const notFound = (req: Request, message = "Not found.") => fail(req, 404, { code: "not_found", message, retry: "no" });
export const unavailable = (req: Request) =>
  fail(req, 503, { code: "unavailable", message: "The directory is temporarily unavailable. Please try again.", retry: "later" });

/** Wraps a handler so an unexpected failure is a clean 503, never a leaked stack or a fake success. */
export function handler(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", route: new URL(req.url).pathname, error: (err as Error).message }));
      return unavailable(req);
    }
  };
}
