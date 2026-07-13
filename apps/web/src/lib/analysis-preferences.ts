export type AnalysisGoal = "save" | "tou" | "solar" | "understand";

export const analysisGoalStorageKey = "thai-energy-planner.analysis-goal.v1";

export const analysisGoalCopy: Record<
  AnalysisGoal,
  { label: string; description: string; nextStep: string }
> = {
  save: {
    label: "อยากลดค่าไฟ",
    description:
      "เริ่มจากบิลและพฤติกรรมใช้ไฟ เพื่อหาโอกาสลดค่าใช้จ่ายที่ทำได้ก่อน",
    nextStep: "เพิ่มข้อมูลบิลค่าไฟ",
  },
  tou: {
    label: "อยากรู้ว่า TOU เหมาะหรือไม่",
    description:
      "ตรวจช่วงเวลาที่ใช้ไฟ แล้วเทียบค่าไฟแบบปกติกับ TOU จากข้อมูลจริง",
    nextStep: "สร้างรูปแบบการใช้ไฟ",
  },
  solar: {
    label: "อยากรู้ว่า Solar คุ้มหรือไม่",
    description:
      "ใช้บิลและรูปแบบการใช้ไฟเพื่อประเมินการใช้ Solar เอง ผลประหยัด และคืนทุน",
    nextStep: "เพิ่มข้อมูลบิลค่าไฟ",
  },
  understand: {
    label: "อยากเข้าใจการใช้ไฟ",
    description:
      "เริ่มจากสร้างรูปแบบการใช้ไฟรายวัน แล้วค่อยดูว่าช่วงใดใช้ไฟมาก",
    nextStep: "สร้างรูปแบบการใช้ไฟ",
  },
};

export function isAnalysisGoal(value: unknown): value is AnalysisGoal {
  return (
    value === "save" ||
    value === "tou" ||
    value === "solar" ||
    value === "understand"
  );
}

export function readAnalysisGoal(): AnalysisGoal | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(analysisGoalStorageKey);
    return isAnalysisGoal(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveAnalysisGoal(goal: AnalysisGoal) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(analysisGoalStorageKey, goal);
}
