import React from "react";

export default async function AnalysisReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
            <h2 className="text-3xl font-bold mb-2 text-slate-800">Q1 Solar Feasibility Report</h2>
            <p className="text-gray-600">Analysis Date: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Engine Version: 0.1.0</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 border-b pb-2">Executive Summary</h3>
          <p className="text-gray-700">
            Based on the analysis of current usage profiles, switching to a TOU tariff combined with a 5kWp Solar installation is projected to yield an annual saving of ~15,000 THB with a payback period of 4.2 years.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-2 bg-gray-100 p-2 rounded">Tariff Snapshot Used</h3>
            <ul className="text-gray-700 space-y-1 mt-2">
              <li><strong>Version:</strong> v1.0.0-draft</li>
              <li><strong>Status:</strong> PUBLISHED</li>
              <li><strong>Source:</strong> PEA API (Saved at time of analysis)</li>
              <li><strong>Effective Date:</strong> 2025-01-01</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 bg-gray-100 p-2 rounded">Assumptions & Variables</h3>
            <ul className="text-gray-700 space-y-1 mt-2">
              <li><strong>Ft Rate:</strong> 0.3972 THB/kWh</li>
              <li><strong>VAT:</strong> 7%</li>
              <li><strong>Solar Degradation:</strong> 0.5% per year</li>
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
              <tr>
                <td className="border p-2">Current Normal</td>
                <td className="border p-2">4,500 THB</td>
                <td className="border p-2">54,000 THB</td>
                <td className="border p-2">-</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border p-2">TOU + Solar 5kWp</td>
                <td className="border p-2">2,800 THB</td>
                <td className="border p-2">33,600 THB</td>
                <td className="border p-2 text-green-700">20,400 THB (37%)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 border-b pb-2">Calculation Breakdown</h3>
          <p className="text-gray-700 text-sm">
            Calculation uses accurate simulation via `calculation-engine` against the frozen tariff snapshot. Peak demand shifted by 60% during 09:00 - 15:00.
          </p>
        </div>
        
        <div className="mb-8 bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="text-lg font-bold text-blue-800 mb-2">Recommendations</h3>
          <p className="text-blue-900">
            Proceed with Solar 5kWp installation and apply for TOU tariff change. Ensure load shifting of high-power appliances to daytime.
          </p>
        </div>
        
        <div className="text-xs text-gray-500 mt-12 italic border-t pt-4 text-center">
          Disclaimer: This report is an estimation based on the provided inputs, assumptions, and historical data. Actual results may vary due to weather, behavior changes, and future tariff updates.
        </div>
      </div>
    </div>
  );
}
