"use client";

import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  analysisGoalCopy,
  getAnalysisGoalGuidance,
} from "@/lib/analysis-preferences";
import { useAnalysisGoal } from "@/lib/use-analysis-goal";

export function AnalysisGoalBanner() {
  const goal = useAnalysisGoal();
  const guidance = getAnalysisGoalGuidance(goal);

  return (
    <section className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Target aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              ระบบกำลังจัดลำดับผลตามเป้าหมายของคุณ
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {guidance.focus}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit shrink-0">
          {analysisGoalCopy[goal].label}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        เป้าหมายมีผลต่อลำดับคำแนะนำเท่านั้น
        ตัวเลขยังคำนวณจากข้อมูลและอัตราเดียวกัน
      </p>
    </section>
  );
}
