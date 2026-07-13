import React from "react";

export default async function TariffVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Versions for Tariff {id}</h1>
      <div className="bg-white p-6 rounded shadow">
        <p>List of versions (Draft, Verified, Published, Retired).</p>
      </div>
    </div>
  );
}
