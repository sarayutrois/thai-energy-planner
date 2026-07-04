import React from "react";
import Link from "next/link";

export default function AdminTariffsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tariff Management</h1>
        <div className="space-x-4">
          <Link href="/admin/tariffs/new" className="bg-blue-600 text-white px-4 py-2 rounded">New Tariff</Link>
          <Link href="/admin/tariffs/import" className="bg-green-600 text-white px-4 py-2 rounded">Import</Link>
          <Link href="/admin/tariffs/export" className="bg-gray-600 text-white px-4 py-2 rounded">Export</Link>
        </div>
      </div>
      <div className="bg-white p-6 rounded shadow">
        <p>Tariff listing will be here.</p>
      </div>
    </div>
  );
}
