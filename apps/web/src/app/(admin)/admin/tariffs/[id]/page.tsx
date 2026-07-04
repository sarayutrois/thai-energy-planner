import React from "react";
import Link from "next/link";

export default async function TariffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tariff Plan {id}</h1>
      <div className="mb-4 space-x-4">
        <Link href={`/admin/tariffs/${id}/versions`} className="text-blue-600 underline">View Versions</Link>
      </div>
      <div className="bg-white p-6 rounded shadow">
        <p>Tariff details here.</p>
      </div>
    </div>
  );
}
