"use client";

import { AiSummaryCard } from "@/components/ai-summary-card";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";

export function AiExecutiveSummary({ analysis }: { analysis: SolarAnalysisResult }) {
  return (
    <AiSummaryCard
      apiEndpoint="/api/solar/summarize"
      colorScheme="purple"
      payload={{
        systemSizeKwp: analysis.sizing.options[0]?.systemSizeKwp || 0,
        npvThb: analysis.financial.npvThb,
        simplePaybackYears: analysis.financial.simplePaybackYears,
        irrPercent: analysis.financial.irrPercent,
        netAnnualBenefit: analysis.billComparison.netAnnualBenefit,
      }}
      deps={[analysis]}
    />
  );
}
