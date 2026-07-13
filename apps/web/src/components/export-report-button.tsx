"use client";

import { Download, Printer } from "lucide-react";
import { usePDF } from "react-to-pdf";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExportReportButton({
  targetId,
  filename = "energy-report.pdf",
}: {
  targetId: string;
  filename?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const { toPDF, targetRef } = usePDF({ filename, page: { margin: 10 } });
  async function exportPdf() {
    const element = document.getElementById(targetId);
    if (!element) return;
    setIsExporting(true);
    try {
      targetRef.current = element;
      await toPDF();
    } finally {
      setIsExporting(false);
    }
  }
  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        พิมพ์
      </Button>
      <Button size="sm" disabled={isExporting} onClick={() => void exportPdf()}>
        <Download className="h-4 w-4" />
        {isExporting ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
      </Button>
    </div>
  );
}
