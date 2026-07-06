import React from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const guardEnabled = Boolean(process.env.ADMIN_ACCESS_TOKEN?.trim());

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col bg-slate-900 p-6 text-white">
        <div
          className={`mb-6 rounded border p-3 text-sm ${
            guardEnabled ? "border-green-600/50 bg-green-600/20 text-green-300" : "border-yellow-600/50 bg-yellow-600/20 text-yellow-500"
          }`}
        >
          <p className="font-semibold">{guardEnabled ? "Admin guard enabled" : "Admin locked"}</p>
          <p>{guardEnabled ? "Admin routes require ADMIN_ACCESS_TOKEN." : "Admin access is locked until a token is configured."}</p>
        </div>
        <h2 className="mb-8 text-xl font-bold">Admin Panel</h2>
        <nav className="flex flex-col gap-4">
          <Link href="/admin/tariffs" className="hover:text-blue-400">
            Tariffs
          </Link>
          <Link href="/admin/ft" className="hover:text-blue-400">
            Ft Rate
          </Link>
          <Link href="/admin/tax" className="hover:text-blue-400">
            Tax Rates
          </Link>
          <Link href="/admin/holidays" className="hover:text-blue-400">
            Holidays
          </Link>
          <Link href="/admin/policies" className="hover:text-blue-400">
            Policies
          </Link>
          <Link href="/admin/audit-logs" className="hover:text-blue-400">
            Audit Logs
          </Link>
        </nav>
      </aside>
      <main className="flex-1 bg-slate-50 p-8">{children}</main>
    </div>
  );
}
