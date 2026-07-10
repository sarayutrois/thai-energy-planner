import { NextResponse } from "next/server";

type RateLimitOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
};

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

/**
 * Lightweight per-instance protection. Configure a shared edge/WAF limiter
 * before horizontally scaling the production deployment.
 */
export function guardApiRequest(
  request: Request,
  options: RateLimitOptions,
): NextResponse | null {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { ok: false, error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  const now = Date.now();
  const client = clientAddress(request);
  const key = `${options.bucket}:${client}`;
  const previous = counters.get(key);
  const counter =
    !previous || previous.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : previous;
  counter.count += 1;
  counters.set(key, counter);

  if (counter.count <= options.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

function clientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
