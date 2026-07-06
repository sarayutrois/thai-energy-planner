"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getEvDemo } from "@/lib/phase6-demo";

export function AiEvSummary({ selectedScenario, comparison }: { selectedScenario: ReturnType<typeof getEvDemo>["selectedScenario"], comparison: ReturnType<typeof getEvDemo>["comparison"] }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/ev/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedStrategy: selectedScenario.strategy,
            bestStrategy: comparison.bestChargingStrategy.strategy,
            addedKwh: selectedScenario.addedEvKwh,
            monthlyIncreaseThb: selectedScenario.monthlyBillIncreaseThb
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
  }, [selectedScenario, comparison]);

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
    <Card className="mt-6 border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-teal-900 flex items-center gap-2">
              AI Executive Summary
            </h3>
            <div className="mt-2 text-sm leading-relaxed text-teal-800/90">
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-full rounded bg-teal-200/50"></div>
                  <div className="h-4 w-5/6 rounded bg-teal-200/50"></div>
                  <div className="h-4 w-4/6 rounded bg-teal-200/50"></div>
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
