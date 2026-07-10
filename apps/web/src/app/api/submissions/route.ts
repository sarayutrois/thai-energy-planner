import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
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

const submissionSchema = z
  .object({
    analysisRunId: z.string().trim().min(8).max(160).optional(),
    inputType: z.string().trim().min(1).max(80),
    metadata: jsonValueSchema.optional(),
    module: z.enum([
      "bill",
      "load_profile",
      "scenario",
      "solar",
      "battery",
      "ev",
      "report",
      "other",
    ]),
    payload: jsonValueSchema,
    sessionId: z.string().trim().min(1).max(160).optional(),
    sourcePage: z.string().trim().min(1).max(300),
  })
  .strict();

export async function POST(request: Request) {
  const blocked = guardApiRequest(request, {
    bucket: "submission-write",
    limit: 20,
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

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid submission payload.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const submission = parsed.data;

  try {
    if (submission.analysisRunId) {
      const analysisRun = await prisma.analysisRun.findFirst({
        where: { id: submission.analysisRunId, userId: auth.user.id },
        select: { id: true },
      });
      if (!analysisRun) {
        return NextResponse.json(
          { ok: false, error: "Analysis run not found." },
          { status: 404 },
        );
      }
    }
    const data: Prisma.UserSubmissionUncheckedCreateInput = {
      userId: auth.user.id,
      inputType: submission.inputType,
      module: submission.module,
      payload: toPrismaJson(submission.payload),
      sourcePage: submission.sourcePage,
      ...(submission.analysisRunId
        ? { analysisRunId: submission.analysisRunId }
        : {}),
      ...(submission.metadata === undefined
        ? {}
        : { metadata: toPrismaJson(submission.metadata) }),
      ...(submission.sessionId ? { sessionId: submission.sessionId } : {}),
    };
    const record = await prisma.userSubmission.create({
      data,
      select: {
        id: true,
      },
    });

    await logAudit(prisma, {
      action: "user_submission_persisted",
      entityType: "UserSubmission",
      entityId: record.id,
      after: {
        analysisRunId: submission.analysisRunId,
        inputType: submission.inputType,
        module: submission.module,
        sourcePage: submission.sourcePage,
      },
    });

    return NextResponse.json({ ok: true, submissionId: record.id });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

function toPrismaJson(value: JsonValue) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
