"use client";

import { AiSummaryCard } from "@/components/ai-summary-card";
import { getEvDemo } from "@/lib/phase6-demo";

export function AiEvSummary({ selectedScenario, comparison }: { selectedScenario: ReturnType<typeof getEvDemo>["selectedScenario"]; comparison: ReturnType<typeof getEvDemo>["comparison"] }) {
  return (
    <AiSummaryCard
      apiEndpoint="/api/ev/summarize"
      colorScheme="teal"
      payload={{
        selectedStrategy: selectedScenario.strategy,
        bestStrategy: comparison.bestChargingStrategy.strategy,
        addedKwh: selectedScenario.addedEvKwh,
        monthlyIncreaseThb: selectedScenario.monthlyBillIncreaseThb,
      }}
      deps={[selectedScenario, comparison]}
    />
  );
}
