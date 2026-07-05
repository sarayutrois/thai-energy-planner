import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";

type LocalReportPayload = {
  id?: string;
  title?: string;
  module?: string;
  moduleLabel?: string;
  summary?: string;
  sourceBill?: unknown;
  resultRows?: unknown;
  recommendations?: unknown;
};

export async function GET() {
  try {
    const reports = await prisma.generatedReport.findMany({
      orderBy: { generatedAt: "desc" },
      take: 50,
      include: {
        analysisRun: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            assumptions: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, reports });
  } catch {
    return NextResponse.json({ ok: false, error: "Database is not available." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: LocalReportPayload;
  try {
    payload = (await request.json()) as LocalReportPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.title || !payload.module) {
    return NextResponse.json({ ok: false, error: "Report title and module are required." }, { status: 400 });
  }

  try {
    const jsonPayload = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
    const analysisRun = await prisma.analysisRun.create({
      data: {
        name: payload.title,
        engineVersion: "0.1.0",
        tariffSnapshot: {
          status: "local-draft",
          source: "browser saved bill workflow"
        },
        inputSnapshot: {
          localReportId: payload.id,
          sourceBill: payload.sourceBill ?? null
        },
        assumptions: jsonPayload
      }
    });
    const report = await prisma.generatedReport.create({
      data: {
        analysisRunId: analysisRun.id,
        format: "JSON",
        fileName: `${payload.id ?? "local-analysis-report"}.json`,
        metadata: jsonPayload
      }
    });

    await logAudit(prisma, {
      action: "local_report_persisted",
      entityType: "GeneratedReport",
      entityId: report?.id,
      after: {
        analysisRunId: analysisRun.id,
        module: payload.module,
        title: payload.title
      }
    });

    return NextResponse.json({
      ok: true,
      analysisRunId: analysisRun.id,
      generatedReportId: report?.id ?? null
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Database is not available." }, { status: 503 });
  }
}
