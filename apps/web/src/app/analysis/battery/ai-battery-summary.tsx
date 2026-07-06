"use client";

import { AiSummaryCard } from "@/components/ai-summary-card";
import type { BatteryAnalysisResult } from "@thai-energy-planner/calculation-engine";
import { getBatteryDemo } from "@/lib/phase6-demo";

export function AiBatterySummary({ analysis, settings }: { analysis: BatteryAnalysisResult; settings: ReturnType<typeof getBatteryDemo>["settings"] }) {
  const isViable = analysis.recommendations.some(r => r.type === "financially_viable");

  return (
    <AiSummaryCard
      apiEndpoint="/api/battery/summarize"
      colorScheme="blue"
      payload={{
        capexThb: settings.capexThb,
        annualSavingsThb: analysis.financial.annualBillSavingsThb,
        paybackYears: analysis.financial.simplePaybackYears,
        isViable,
      }}
      deps={[analysis, settings]}
    />
  );
}
