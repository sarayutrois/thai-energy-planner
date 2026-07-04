import React from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col">
        <div className="mb-6 rounded bg-yellow-600/20 p-3 text-sm text-yellow-500 border border-yellow-600/50">
          <p className="font-semibold">⚠️ DEV ONLY</p>
          <p>Auth guard is disabled. Do not deploy to production without securing these routes.</p>
        </div>
        <h2 className="text-xl font-bold mb-8">Admin Panel</h2>
        <nav className="flex flex-col gap-4">
          <Link href="/admin/tariffs" className="hover:text-blue-400">Tariffs</Link>
          <Link href="/admin/ft" className="hover:text-blue-400">Ft Rate</Link>
          <Link href="/admin/tax" className="hover:text-blue-400">Tax Rates</Link>
          <Link href="/admin/holidays" className="hover:text-blue-400">Holidays</Link>
          <Link href="/admin/policies" className="hover:text-blue-400">Policies</Link>
          <Link href="/admin/audit-logs" className="hover:text-blue-400">Audit Logs</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
