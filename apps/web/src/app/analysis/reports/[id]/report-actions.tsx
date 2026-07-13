"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Printer } from "lucide-react";
import { exportToCsv, exportToJson } from "@thai-energy-planner/report-engine";
import { Button } from "@/components/ui/button";

type CsvRow = Record<string, string | number | null | undefined>;

export function ReportActions({
  csvRows,
  fileBaseName = "thai-energy-planner-report",
  jsonData,
  pdfLabel = "ดาวน์โหลด PDF",
  pdfTargetId,
}: {
  csvRows?: CsvRow[] | undefined;
  fileBaseName?: string | undefined;
  jsonData?: unknown;
  pdfLabel?: string | undefined;
  pdfTargetId: string;
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const canExportJson = jsonData !== undefined;
  const canExportCsv = Boolean(csvRows?.length);
  const canExportPdf = jsonData !== undefined && Boolean(pdfTargetId);

  async function downloadPdf() {
    if (!canExportPdf || isGeneratingPdf) return;
    const target = document.getElementById(pdfTargetId);
    if (!target) {
      setPdfError("ไม่พบเนื้อหารายงาน กรุณารีเฟรชหน้าแล้วลองอีกครั้ง");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError("");
    target.setAttribute("data-pdf-exporting", "true");

    try {
      await document.fonts.ready;
      const {
        default: generatePdf,
        Margin,
        Resolution,
      } = await import("react-to-pdf");
      await generatePdf(() => target, {
        filename: `${safeFileName(fileBaseName)}.pdf`,
        method: "save",
        resolution: Resolution.NORMAL,
        page: {
          margin: Margin.SMALL,
          format: "a4",
          orientation: "portrait",
        },
        canvas: {
          mimeType: "image/png",
          qualityRatio: 1,
        },
        overrides: {
          pdf: { compress: true },
          canvas: {
            backgroundColor: "#ffffff",
            logging: false,
            useCORS: true,
            ignoreElements: (element) =>
              element.hasAttribute("data-pdf-exclude"),
          },
        },
      });
    } catch {
      setPdfError(
        "สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่หรือใช้ปุ่มพิมพ์เพื่อบันทึกเป็น PDF",
      );
    } finally {
      target.removeAttribute("data-pdf-exporting");
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className="grid gap-2 print:hidden" data-pdf-exclude>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => window.print()} type="button">
          <Printer aria-hidden="true" className="h-4 w-4" />
          พิมพ์ / บันทึก PDF
        </Button>
        <Button
          disabled={!canExportPdf || isGeneratingPdf}
          onClick={() => void downloadPdf()}
          type="button"
          variant="outline"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          {isGeneratingPdf ? "กำลังสร้าง PDF..." : pdfLabel}
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
      {pdfError ? (
        <p className="text-sm text-destructive" role="alert">
          {pdfError}
        </p>
      ) : null}
    </div>
  );
}

function downloadTextFile(fileName: string, content: string, type: string) {
  downloadBlob(fileName, new Blob([content], { type }));
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
