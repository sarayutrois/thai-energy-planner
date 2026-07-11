import { NextResponse } from "next/server";
import {
  estimateRequestSchema,
  runEstimateApiCalculation,
  zodIssues,
} from "@/lib/calculation-api";
import { guardApiRequest } from "@/lib/api-security";

export async function POST(request: Request) {
  const blocked = guardApiRequest(request, {
    bucket: "estimate",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = estimateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid estimate request.",
        issues: zodIssues(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      ok: true,
      ...runEstimateApiCalculation(parsed.data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Estimate calculation failed.",
      },
      { status: 422 },
    );
  }
}
