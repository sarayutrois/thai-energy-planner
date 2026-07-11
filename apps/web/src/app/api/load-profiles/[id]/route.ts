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

  const profile = await prisma.loadProfile.findFirst({
    where: { id, userId: auth.user.id },
    select: {
      id: true,
      name: true,
      source: true,
      intervalMinutes: true,
      timezone: true,
      validationSummary: true,
      createdAt: true,
      updatedAt: true,
      intervals: {
        orderBy: { timestamp: "asc" },
        select: {
          timestamp: true,
          energyKwh: true,
          powerKw: true,
          metadata: true,
        },
      },
    },
  });
  if (!profile) return notFound();
  return NextResponse.json({ ok: true, profile });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();

  const deleted = await prisma.loadProfile.deleteMany({
    where: { id, userId: auth.user.id },
  });
  if (deleted.count === 0) return notFound();
  return NextResponse.json({ ok: true });
}

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Load profile not found." },
    { status: 404 },
  );
}
