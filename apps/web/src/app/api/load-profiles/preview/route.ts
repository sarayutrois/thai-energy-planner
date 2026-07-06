import { NextResponse } from "next/server";
import {
  defaultColumnMapping,
  parseCsvLoadProfile,
  parseXlsxLoadProfile,
} from "@thai-energy-planner/calculation-engine/load-data";

const maxUploadBytes = 10 * 1024 * 1024;
const allowedIntervals = new Set([15, 30, 60]);

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid form data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing load profile file." },
      { status: 400 },
    );
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json(
      { ok: false, error: "File is larger than 10MB." },
      { status: 413 },
    );
  }

  const intervalMinutes = Number(formData.get("intervalMinutes") ?? 60);
  if (!allowedIntervals.has(intervalMinutes)) {
    return NextResponse.json(
      { ok: false, error: "Interval must be 15, 30, or 60 minutes." },
      { status: 400 },
    );
  }

  const mapping = {
    ...defaultColumnMapping,
    timestamp: getRequiredFormString(formData, "timestamp", "timestamp"),
    energyKwh: getOptionalFormString(formData, "energyKwh"),
    powerKw: getOptionalFormString(formData, "powerKw"),
    meterId: getOptionalFormString(formData, "meterId"),
  };

  try {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
      const preview = parseCsvLoadProfile(await file.text(), {
        mapping,
        intervalMinutes: intervalMinutes as 15 | 30 | 60,
        timezone: "Asia/Bangkok",
      });
      return NextResponse.json({ ok: true, preview });
    }

    if (fileName.endsWith(".xlsx")) {
      const preview = parseXlsxLoadProfile(await file.arrayBuffer(), {
        mapping,
        intervalMinutes: intervalMinutes as 15 | 30 | 60,
        timezone: "Asia/Bangkok",
      });
      return NextResponse.json({ ok: true, preview });
    }

    return NextResponse.json(
      { ok: false, error: "Only CSV and XLSX files are supported." },
      { status: 400 },
    );
  } catch (caught) {
    const error =
      caught instanceof Error
        ? caught.message
        : "Unable to parse load profile file.";
    return NextResponse.json({ ok: false, error }, { status: 422 });
  }
}

function getRequiredFormString(
  formData: FormData,
  key: string,
  fallback: string,
) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function getOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}
