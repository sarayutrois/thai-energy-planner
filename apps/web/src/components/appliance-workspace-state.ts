export type ApplianceWorkspaceMode = "empty" | "sample" | "user";

export function storedApplianceWorkspaceMode(
  value: unknown,
  applianceCount: number,
): ApplianceWorkspaceMode {
  if (applianceCount === 0) return "empty";
  return value === "sample" || value === "user" ? value : "empty";
}

export function applianceSourceLabel(mode: ApplianceWorkspaceMode): string {
  if (mode === "sample") return "คำนวณจากอุปกรณ์ตัวอย่าง";
  if (mode === "user") return "คำนวณจากรายการของคุณ";
  return "ยังไม่มีข้อมูล";
}
