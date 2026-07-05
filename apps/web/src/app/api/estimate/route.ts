import { NextResponse } from "next/server";
import { estimateRequestSchema, runEstimateApiCalculation, zodIssues } from "@/lib/calculation-api";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = estimateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid estimate request.", issues: zodIssues(parsed.error) },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ ok: true, ...runEstimateApiCalculation(parsed.data) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Estimate calculation failed."
      },
      { status: 422 }
    );
  }
}
