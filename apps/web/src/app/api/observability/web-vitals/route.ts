import { NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/api-security";

const ALLOWED_METRICS = new Set([
  "CLS",
  "FCP",
  "FID",
  "INP",
  "LCP",
  "TTFB",
  "Next.js-hydration",
  "Next.js-route-change-to-render",
  "Next.js-render",
]);

type WebVitalPayload = {
  path: string;
  name: string;
  value: number;
  startTime: number;
};

export async function POST(request: Request) {
  const blocked = guardApiRequest(request, {
    bucket: "web-vitals",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_048) {
    return NextResponse.json(
      { ok: false, error: "Payload too large." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!isWebVitalPayload(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid web vital payload." },
      { status: 400 },
    );
  }

  // Structured runtime logs provide route-level diagnostics without user or energy data.
  // eslint-disable-next-line no-console
  console.info(JSON.stringify({ event: "web_vital", ...body }));

  return new NextResponse(null, { status: 204 });
}

function isWebVitalPayload(value: unknown): value is WebVitalPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WebVitalPayload>;
  return (
    candidate.path === "/analysis/solar" &&
    typeof candidate.name === "string" &&
    ALLOWED_METRICS.has(candidate.name) &&
    typeof candidate.value === "number" &&
    Number.isFinite(candidate.value) &&
    candidate.value >= 0 &&
    typeof candidate.startTime === "number" &&
    Number.isFinite(candidate.startTime) &&
    candidate.startTime >= 0
  );
}
