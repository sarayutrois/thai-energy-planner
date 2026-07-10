"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const supabase = getSupabaseBrowserClient();
  const session = supabase
    ? (await supabase.auth.getSession()).data.session
    : null;
  const headers = new Headers(init.headers);
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
