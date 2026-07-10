import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";

const reportIdPattern = /^[a-z0-9_-]{8,160}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!reportIdPattern.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid report id." },
      { status: 400 },
    );
  }

  try {
    const report = await prisma.generatedReport.findUnique({
      where: { id },
      select: {
        id: true,
        format: true,
        fileName: true,
        storageUrl: true,
        generatedAt: true,
        metadata: true,
        analysisRun: {
          select: {
            id: true,
            name: true,
            engineVersion: true,
            createdAt: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { ok: false, error: "Report not found." },
        { status: 404 },
      );
    }

    if (!hasReportAccess(request, report.metadata)) {
      return NextResponse.json(
        { ok: false, error: "Report not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, report });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!reportIdPattern.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid report id." },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.generatedReport.findUnique({
      where: { id },
      select: {
        id: true,
        analysisRunId: true,
        fileName: true,
        metadata: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Report not found." },
        { status: 404 },
      );
    }

    if (!hasReportAccess(request, existing.metadata)) {
      return NextResponse.json(
        { ok: false, error: "Report not found." },
        { status: 404 },
      );
    }

    await prisma.generatedReport.delete({
      where: { id },
    });

    await logAudit(prisma, {
      action: "generated_report_deleted",
      entityType: "GeneratedReport",
      entityId: existing.id,
      before: existing,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

function hasReportAccess(request: Request, metadata: unknown) {
  const token = request.headers.get("x-report-access-token");
  if (!token || !metadata || typeof metadata !== "object") return false;
  const savedToken = (metadata as Record<string, unknown>).reportAccessToken;
  return typeof savedToken === "string" && savedToken === token;
}

function isTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
