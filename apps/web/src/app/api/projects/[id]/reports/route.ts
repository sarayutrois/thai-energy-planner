import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

const idPattern = /^[a-z0-9_-]{8,160}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();

  try {
    const project = await prisma.site.findFirst({
      where: { id, organization: { is: { ownerId: auth.user.id } } },
      select: { id: true },
    });
    if (!project) return notFound();

    const reports = await prisma.generatedReport.findMany({
      where: {
        analysisRun: { is: { siteId: id, userId: auth.user.id } },
      },
      orderBy: { generatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        generatedAt: true,
        metadata: true,
        analysisRun: { select: { id: true } },
      },
    });
    return NextResponse.json({
      ok: true,
      reports: reports.map((report) => ({
        id: report.id,
        analysisRunId: report.analysisRun.id,
        generatedAt: report.generatedAt.toISOString(),
        metadata: report.metadata,
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Project not found." },
    { status: 404 },
  );
}
