import React from "react";

const savedReportPreview = {
  title: "Q1 Solar Feasibility Report",
  createdAt: "2025-01-10T10:00:00Z",
  engineVersion: "0.1.0",
  executiveSummary:
    "Based on the saved analysis snapshot, switching to TOU combined with a 5kWp Solar installation is projected to improve annual energy costs with a multi-year payback.",
  tariffSnapshot: {
    versionLabel: "v1.0.0-draft",
    status: "PUBLISHED",
    source: "PEA API (saved at analysis time)",
    effectiveFrom: "2025-01-01",
    capturedAt: "2025-01-10T10:00:00Z"
  },
  assumptions: [
    { label: "Tariff charges", value: "Captured in saved tariff snapshot" },
    { label: "Tax and Ft inputs", value: "Captured in saved tariff snapshot" },
    { label: "Solar assumptions", value: "Captured in saved analysis inputs" }
  ],
  scenarioRows: [
    { name: "Current Normal", monthlyBill: "4,500 THB", annualBill: "54,000 THB", savings: "-" },
    { name: "TOU + Solar 5kWp", monthlyBill: "2,800 THB", annualBill: "33,600 THB", savings: "20,400 THB (37%)" }
  ],
  calculationNote:
    "Calculation uses calculation-engine results stored with the report snapshot. Tariff values are read from the frozen tariff snapshot captured with the analysis.",
  recommendation:
    "Proceed with Solar 5kWp installation and apply for TOU tariff change. Ensure load shifting of high-power appliances to daytime."
};

export default async function AnalysisReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tariffSnapshot = savedReportPreview.tariffSnapshot;
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Report Preview: {id}</h1>
        <div className="space-x-4 flex">
          <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Export PDF</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">Export CSV</button>
          <button className="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700">Export JSON</button>
          <button className="bg-slate-800 text-white px-4 py-2 rounded shadow hover:bg-slate-900">Print</button>
        </div>
      </div>
      
      <div className="bg-white p-10 rounded shadow print:shadow-none print:p-0">
        
        <div className="mb-8 border-b pb-4 flex justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-slate-800">{savedReportPreview.title}</h2>
            <p className="text-gray-600">Analysis Date: {new Date(savedReportPreview.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Engine Version: {savedReportPreview.engineVersion}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 border-b pb-2">Executive Summary</h3>
          <p className="text-gray-700">
            {savedReportPreview.executiveSummary}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-2 bg-gray-100 p-2 rounded">Tariff Snapshot Used</h3>
            <ul className="text-gray-700 space-y-1 mt-2">
              <li><strong>Version:</strong> {tariffSnapshot.versionLabel}</li>
              <li><strong>Status:</strong> {tariffSnapshot.status}</li>
              <li><strong>Source:</strong> {tariffSnapshot.source}</li>
              <li><strong>Effective Date:</strong> {tariffSnapshot.effectiveFrom}</li>
              <li><strong>Captured At:</strong> {new Date(tariffSnapshot.capturedAt).toLocaleString()}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 bg-gray-100 p-2 rounded">Assumptions & Variables</h3>
            <ul className="text-gray-700 space-y-1 mt-2">
              {savedReportPreview.assumptions.map((item) => (
                <li key={item.label}><strong>{item.label}:</strong> {item.value}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 border-b pb-2">Scenario Comparison</h3>
          <table className="w-full text-left border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2">Scenario</th>
                <th className="border p-2">Monthly Bill (Avg)</th>
                <th className="border p-2">Annual Bill</th>
                <th className="border p-2">Savings</th>
              </tr>
            </thead>
            <tbody>
              {savedReportPreview.scenarioRows.map((row, index) => (
                <tr key={row.name} className={index === 1 ? "bg-green-50" : undefined}>
                  <td className="border p-2">{row.name}</td>
                  <td className="border p-2">{row.monthlyBill}</td>
                  <td className="border p-2">{row.annualBill}</td>
                  <td className={index === 1 ? "border p-2 text-green-700" : "border p-2"}>{row.savings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 border-b pb-2">Calculation Breakdown</h3>
          <p className="text-gray-700 text-sm">
            {savedReportPreview.calculationNote}
          </p>
        </div>
        
        <div className="mb-8 bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="text-lg font-bold text-blue-800 mb-2">Recommendations</h3>
          <p className="text-blue-900">
            {savedReportPreview.recommendation}
          </p>
        </div>
        
        <div className="text-xs text-gray-500 mt-12 italic border-t pt-4 text-center">
          Disclaimer: This report is an estimation based on the provided inputs, assumptions, and historical data. Actual results may vary due to weather, behavior changes, and future tariff updates.
        </div>
      </div>
    </div>
  );
}
