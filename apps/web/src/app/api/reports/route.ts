import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import { guardApiRequest } from "@/lib/api-security";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
) as z.ZodType<JsonValue>;

const localReportIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_-]{1,160}$/i);

const localReportPayloadSchema = z
  .object({
    createdAt: z.string().datetime().optional(),
    disclaimer: z.string().trim().max(5_000).optional(),
    id: localReportIdSchema.optional(),
    title: z.string().trim().min(1).max(240),
    reportTitle: z.string().trim().min(1).max(240).optional(),
    module: z.enum(["scenario", "solar", "battery", "ev", "ecosystem"]),
    moduleLabel: z.string().trim().min(1).max(80).optional(),
    printedAtLabel: z.string().trim().max(120).optional(),
    summary: z.string().trim().max(5_000).optional(),
    sourceBillReportId: z.string().trim().max(160).optional(),
    sourcePath: z.string().trim().max(300).optional(),
    sourceBill: jsonValueSchema.optional(),
    resultRows: z.array(z.record(jsonValueSchema)).max(500).optional(),
    recommendations: z.array(jsonValueSchema).max(100).optional(),
    metrics: z.array(jsonValueSchema).max(100).optional(),
    assumptions: z.array(jsonValueSchema).max(150).optional(),
    sections: z.array(jsonValueSchema).max(50).optional(),
    limitations: z.array(jsonValueSchema).max(50).optional(),
    references: z.array(jsonValueSchema).max(50).optional(),
    reportAccessToken: z.string().uuid(),
    projectId: z
      .string()
      .trim()
      .regex(/^[a-z0-9_-]{8,160}$/i)
      .optional(),
  })
  .strict();

type LocalReportPayload = z.infer<typeof localReportPayloadSchema>;

export async function GET(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { ok: false, error: "Report listing requires an authenticated service." },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const blocked = guardApiRequest(request, {
    bucket: "report-write",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Untrusted request origin." },
      { status: 403 },
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

  const parsed = localReportPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid report payload.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const payload: LocalReportPayload = parsed.data;

  try {
    if (payload.projectId) {
      const project = await prisma.site.findFirst({
        where: {
          id: payload.projectId,
          organization: { is: { ownerId: auth.user.id } },
        },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(
          { ok: false, error: "Project not found." },
          { status: 404 },
        );
      }
    }
    const jsonPayload = JSON.parse(
      JSON.stringify(payload),
    ) as Prisma.InputJsonObject;
    const analysisRun = await prisma.analysisRun.create({
      data: {
        userId: auth.user.id,
        ...(payload.projectId ? { siteId: payload.projectId } : {}),
        name: payload.title,
        engineVersion: "0.1.0",
        tariffSnapshot: {
          status: "local-draft",
          source: "browser saved bill workflow",
        },
        inputSnapshot: {
          localReportId: payload.id,
          sourceBill: payload.sourceBill ?? null,
        },
        assumptions: jsonPayload,
      },
    });
    const report = await prisma.generatedReport.create({
      data: {
        analysisRunId: analysisRun.id,
        format: "JSON",
        fileName: `${payload.id ?? "local-analysis-report"}.json`,
        metadata: jsonPayload,
      },
    });

    await logAudit(prisma, {
      action: "local_report_persisted",
      entityType: "GeneratedReport",
      entityId: report?.id,
      after: {
        analysisRunId: analysisRun.id,
        module: payload.module,
        title: payload.title,
      },
    });

    return NextResponse.json({
      ok: true,
      analysisRunId: analysisRun.id,
      generatedReportId: report?.id ?? null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

function isTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
