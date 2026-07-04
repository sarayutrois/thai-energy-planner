"use client";

import { Download, FileJson, FileSpreadsheet, Printer } from "lucide-react";
import { exportToCsv, exportToJson } from "@thai-energy-planner/report-engine";

type CsvRow = Record<string, string | number | null | undefined>;

export function ReportActions({
  csvRows,
  fileBaseName = "thai-energy-planner-report",
  jsonData
}: {
  csvRows?: CsvRow[] | undefined;
  fileBaseName?: string | undefined;
  jsonData?: unknown;
}) {
  const canExportJson = jsonData !== undefined;
  const canExportCsv = Boolean(csvRows?.length);

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={() => window.print()}
        type="button"
      >
        <Printer aria-hidden="true" className="h-4 w-4" />
        Print
      </button>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        disabled
        type="button"
      >
        <Download aria-hidden="true" className="h-4 w-4" />
        PDF ถัดไป
      </button>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        disabled={!canExportJson}
        onClick={() => {
          if (!canExportJson) return;
          downloadTextFile(`${safeFileName(fileBaseName)}.json`, exportToJson(jsonData), "application/json;charset=utf-8");
        }}
        type="button"
      >
        <FileJson aria-hidden="true" className="h-4 w-4" />
        Export JSON
      </button>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        disabled={!canExportCsv}
        onClick={() => {
          if (!canExportCsv || !csvRows) return;
          downloadTextFile(`${safeFileName(fileBaseName)}.csv`, exportToCsv(csvRows), "text/csv;charset=utf-8");
        }}
        type="button"
      >
        <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
        Export CSV
      </button>
    </div>
  );
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return value.trim().replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "thai-energy-planner-report";
}
