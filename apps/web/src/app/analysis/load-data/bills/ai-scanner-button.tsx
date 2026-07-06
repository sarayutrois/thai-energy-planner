"use client";

import { useState, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";

export function AiScannerButton({ onScanSuccess }: { onScanSuccess: (bill: MonthlyBillInput) => void }) {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/bills/scan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan bill");
      }

      const data = await response.json();
      
      // Basic validation of the AI output
      if (data && data.month && data.energyKwh !== undefined && data.totalCostThb !== undefined) {
        onScanSuccess({
          month: data.month,
          energyKwh: Number(data.energyKwh),
          totalCostThb: Number(data.totalCostThb),
          authority: data.authority === "PEA" || data.authority === "MEA" ? data.authority : undefined,
        });
      } else {
        alert("AI could not extract all required fields from the image.");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(error);
      alert("Error scanning bill: " + msg);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 text-sm font-medium text-purple-700 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
        onClick={() => fileInputRef.current?.click()}
        disabled={isScanning}
        type="button"
        title="สแกนบิลด้วย AI"
      >
        {isScanning ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles aria-hidden="true" className="h-4 w-4" />
        )}
        สแกนบิลด้วย AI
      </button>
      <input
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />
    </>
  );
}
