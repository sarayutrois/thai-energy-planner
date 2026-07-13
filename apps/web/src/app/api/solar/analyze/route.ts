import { NextResponse } from "next/server";
import {
  runSolarAnalyzeApiCalculation,
  solarAnalyzeRequestSchema,
  type SolarResourceOverride,
  zodIssues,
} from "@/lib/calculation-api";
import { guardApiRequest } from "@/lib/api-security";

export async function POST(request: Request) {
  const blocked = guardApiRequest(request, {
    bucket: "solar-analyze",
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

  const parsed = solarAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid solar analysis request.",
        issues: zodIssues(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const solarResource = await getPvgisSolarResource(parsed.data);
    return NextResponse.json({
      ok: true,
      ...runSolarAnalyzeApiCalculation(parsed.data, solarResource),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Solar analysis failed.",
      },
      { status: 422 },
    );
  }
}

async function getPvgisSolarResource(input: {
  latitude?: number | undefined;
  longitude?: number | undefined;
  roofAzimuth?: number | undefined;
  roofTilt?: number | undefined;
}): Promise<SolarResourceOverride | undefined> {
  if (input.latitude === undefined || input.longitude === undefined)
    return undefined;
  const params = new URLSearchParams({
    lat: String(input.latitude),
    lon: String(input.longitude),
    peakpower: "1",
    loss: "0",
    angle: String(input.roofTilt ?? 12),
    aspect: String((input.roofAzimuth ?? 180) - 180),
    outputformat: "json",
  });
  const response = await fetch(
    `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${params.toString()}`,
    {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8_000),
    },
  ).catch(() => null);
  if (!response?.ok) return undefined;
  const data = (await response.json()) as {
    outputs?: { monthly?: { fixed?: Array<{ month?: number; E_m?: number }> } };
  };
  const monthly = data.outputs?.monthly?.fixed ?? [];
  const yields = Array.from({ length: 12 }, (_, index) => {
    const value = monthly.find((row) => row.month === index + 1)?.E_m;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  });
  if (yields.some((value) => value === null)) return undefined;
  return {
    monthlySpecificYieldKwhPerKwp: yields as number[],
    source: {
      status: "published",
      sourceUrl: "https://re.jrc.ec.europa.eu/pvg_tools/en/",
      authority: "PVGIS (European Commission)",
      notes: `PVcalc monthly yield at ${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)} with the selected roof tilt and azimuth.`,
      verifiedAt: new Date().toISOString().slice(0, 10),
    },
  };
}
