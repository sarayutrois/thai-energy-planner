"use client";

import { Download, FileJson, FileSpreadsheet, Printer } from "lucide-react";
import {
  exportToCsv,
  exportToJson,
  exportToPdf,
} from "@thai-energy-planner/report-engine";
import { Button } from "@/components/ui/button";

type CsvRow = Record<string, string | number | null | undefined>;

export function ReportActions({
  csvRows,
  fileBaseName = "thai-energy-planner-report",
  jsonData,
  pdfLabel = "ดาวน์โหลด PDF",
}: {
  csvRows?: CsvRow[] | undefined;
  fileBaseName?: string | undefined;
  jsonData?: unknown;
  pdfLabel?: string | undefined;
}) {
  const canExportJson = jsonData !== undefined;
  const canExportCsv = Boolean(csvRows?.length);
  const canExportPdf = jsonData !== undefined;

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button onClick={() => window.print()} type="button">
        <Printer aria-hidden="true" className="h-4 w-4" />
        พิมพ์
      </Button>
      <Button
        disabled={!canExportPdf}
        onClick={() => {
          if (!canExportPdf) return;
          downloadBinaryFile(
            `${safeFileName(fileBaseName)}.pdf`,
            exportToPdf(jsonData),
            "application/pdf",
          );
        }}
        type="button"
        variant="outline"
      >
        <Download aria-hidden="true" className="h-4 w-4" />
        {pdfLabel}
      </Button>
      <Button
        disabled={!canExportJson}
        onClick={() => {
          if (!canExportJson) return;
          downloadTextFile(
            `${safeFileName(fileBaseName)}.json`,
            exportToJson(jsonData),
            "application/json;charset=utf-8",
          );
        }}
        type="button"
        variant="outline"
      >
        <FileJson aria-hidden="true" className="h-4 w-4" />
        ดาวน์โหลด JSON
      </Button>
      <Button
        disabled={!canExportCsv}
        onClick={() => {
          if (!canExportCsv || !csvRows) return;
          downloadTextFile(
            `${safeFileName(fileBaseName)}.csv`,
            exportToCsv(csvRows),
            "text/csv;charset=utf-8",
          );
        }}
        type="button"
        variant="outline"
      >
        <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
        ดาวน์โหลด CSV
      </Button>
    </div>
  );
}

function downloadTextFile(fileName: string, content: string, type: string) {
  downloadBlob(fileName, new Blob([content], { type }));
}

function downloadBinaryFile(
  fileName: string,
  content: Uint8Array,
  type: string,
) {
  const arrayBuffer = content.buffer.slice(
    content.byteOffset,
    content.byteOffset + content.byteLength,
  ) as ArrayBuffer;
  downloadBlob(fileName, new Blob([arrayBuffer], { type }));
}

function downloadBlob(fileName: string, blob: Blob) {
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
  return (
    value
      .trim()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "thai-energy-planner-report"
  );
}
