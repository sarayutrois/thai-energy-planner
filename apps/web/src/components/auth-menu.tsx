"use client";

import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(mode: "signIn" | "signUp") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("ยังไม่ได้ตั้งค่า Supabase ในระบบนี้");
      return;
    }
    setMessage("กำลังดำเนินการ...");
    const result =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setMessage(
      result.error
        ? result.error.message
        : mode === "signUp"
          ? "สร้างบัญชีแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
          : "เข้าสู่ระบบแล้ว",
    );
    if (!result.error && mode === "signIn") {
      setOpen(false);
      window.dispatchEvent(new Event("thai-energy-planner:auth-changed"));
    }
  }

  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
    window.dispatchEvent(new Event("thai-energy-planner:auth-changed"));
    setOpen(false);
  }

  if (user) {
    return (
      <div className="relative">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <UserRound className="h-4 w-4" />
          <span className="hidden sm:inline">{user.email}</span>
        </button>
        {open ? (
          <div className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-background p-3 shadow-lg">
            <p className="mb-3 break-all text-xs text-muted-foreground">
              {user.email}
            </p>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              onClick={() => void signOut()}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <LogIn className="h-4 w-4" />
        เข้าสู่ระบบ
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-80 rounded-md border border-border bg-background p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium">
            เข้าสู่ระบบเพื่อบันทึกข้อมูลส่วนตัว
          </p>
          <input
            className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="อีเมล"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="รหัสผ่าน"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => void submit("signIn")}
              type="button"
            >
              เข้าสู่ระบบ
            </button>
            <button
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={() => void submit("signUp")}
              type="button"
            >
              สร้างบัญชี
            </button>
          </div>
          {message ? (
            <p className="mt-3 text-xs text-muted-foreground">{message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
