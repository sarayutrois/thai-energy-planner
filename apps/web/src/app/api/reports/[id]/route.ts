import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const report = await prisma.generatedReport.findUnique({
      where: { id },
      include: {
        analysisRun: true
      }
    });

    if (!report) {
      return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, report });
  } catch {
    return NextResponse.json({ ok: false, error: "Database is not available." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const deleted = await prisma.generatedReport.delete({
      where: { id }
    });

    await logAudit(prisma, {
      action: "generated_report_deleted",
      entityType: "GeneratedReport",
      entityId: deleted.id,
      before: deleted
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Report not found or database is not available." }, { status: 404 });
  }
}
