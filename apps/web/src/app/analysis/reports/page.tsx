"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface ReportItem {
  id: string;
  name: string;
  date: string;
  tariffVersion: string;
  status: string;
}

export default function AnalysisReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);

  useEffect(() => {
    // Simulate fetching
    const timer = setTimeout(() => {
      setReports([
        {
          id: "demo-id-1",
          name: "Q1 Solar Feasibility",
          date: "2025-01-10T10:00:00Z",
          tariffVersion: "v1.0.0-draft",
          status: "PUBLISHED"
        }
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Analysis Reports</h1>
      
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Search reports..." 
          className="border p-2 rounded w-full max-w-md"
        />
      </div>

      <div className="bg-white p-6 rounded shadow min-h-[300px]">
        {loading && <div className="text-center py-10 text-gray-500">Loading reports...</div>}
        
        {!loading && reports.length === 0 && (
          <div className="text-center py-10 text-gray-500">No reports found. (Empty State)</div>
        )}

        {!loading && reports.length > 0 && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2">Analysis Name</th>
                <th className="py-2">Date Created</th>
                <th className="py-2">Tariff Used</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-2">{r.tariffVersion}</td>
                  <td className="py-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link href={`/analysis/reports/${r.id}`} className="text-blue-600 hover:underline">
                      View Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
