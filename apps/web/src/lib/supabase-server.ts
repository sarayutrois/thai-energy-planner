import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function requireAuthenticatedUser(
  request: Request,
): Promise<
  | { user: AuthenticatedUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Authentication is not configured." },
        { status: 503 },
      ),
    };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const user = {
    id: data.user.id,
    email: data.user.email ?? null,
    name:
      typeof data.user.user_metadata.full_name === "string"
        ? data.user.user_metadata.full_name
        : typeof data.user.user_metadata.name === "string"
          ? data.user.user_metadata.name
          : null,
  };
  await prisma.user.upsert({
    where: { id: user.id },
    create: user,
    update: { email: user.email, name: user.name },
  });
  return { user };
}
