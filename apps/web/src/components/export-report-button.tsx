"use client";

import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePDF } from "react-to-pdf";
import { useState } from "react";

interface ExportReportButtonProps {
  targetId: string;
  filename?: string;
}

export function ExportReportButton({ targetId, filename = "energy-report.pdf" }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toPDF, targetRef } = usePDF({
    filename,
    page: { margin: 10 },
  });

  const handleExport = async () => {
    setIsExporting(true);
    // Find the element by ID and attach the ref manually since the button might be outside the target
    const element = document.getElementById(targetId);
    if (element && targetRef) {
      targetRef.current = element;
      await toPDF();
    }
    setIsExporting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
        <Printer className="h-4 w-4" />
        พิมพ์
      </Button>
      <Button variant="default" size="sm" onClick={handleExport} disabled={isExporting} className="gap-2">
        <Download className="h-4 w-4" />
        {isExporting ? "กำลังสร้าง PDF..." : "บันทึก PDF"}
      </Button>
    </div>
  );
}
