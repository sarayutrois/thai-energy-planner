"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BatteryAnalysisResult } from "@thai-energy-planner/calculation-engine";
import { getBatteryDemo } from "@/lib/phase6-demo";

export function AiBatterySummary({ analysis, settings }: { analysis: BatteryAnalysisResult, settings: ReturnType<typeof getBatteryDemo>["settings"] }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      setIsLoading(true);
      setError(null);
      try {
        const isViable = analysis.recommendations.some(r => r.type === "financially_viable");
        
        const response = await fetch("/api/battery/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            capexThb: settings.capexThb,
            annualSavingsThb: analysis.financial.annualBillSavingsThb,
            paybackYears: analysis.financial.simplePaybackYears,
            isViable
          })
        });

        if (!response.ok) {
          throw new Error("Failed to fetch summary");
        }

        const data = await response.json();
        setSummary(data.summary);
      } catch (err: unknown) {
        console.error(err);
        setError("ไม่สามารถโหลดบทสรุป AI ได้ในขณะนี้");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSummary();
  }, [analysis, settings]);

  if (error) {
    return (
      <Card className="mt-6 border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-center gap-3 p-4">
          <Info className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              AI Executive Summary
            </h3>
            <div className="mt-2 text-sm leading-relaxed text-blue-800/90">
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-full rounded bg-blue-200/50"></div>
                  <div className="h-4 w-5/6 rounded bg-blue-200/50"></div>
                  <div className="h-4 w-4/6 rounded bg-blue-200/50"></div>
                </div>
              ) : (
                <p>{summary}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
