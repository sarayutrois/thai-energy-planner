"use client";

import { useEffect, useState } from "react";
import {
  analysisGoalStorageKey,
  isAnalysisGoal,
  readAnalysisGoal,
  type AnalysisGoal,
} from "@/lib/analysis-preferences";

export function useAnalysisGoal() {
  const [goal, setGoal] = useState<AnalysisGoal>("save");

  useEffect(() => {
    setGoal(readAnalysisGoal() ?? "save");

    function syncGoal(event: StorageEvent) {
      if (
        event.key === analysisGoalStorageKey &&
        isAnalysisGoal(event.newValue)
      ) {
        setGoal(event.newValue);
      }
    }

    window.addEventListener("storage", syncGoal);
    return () => window.removeEventListener("storage", syncGoal);
  }, []);

  return goal;
}
