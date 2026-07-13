import { describe, expect, it } from "vitest";
import {
  applianceSourceLabel,
  storedApplianceWorkspaceMode,
} from "./appliance-workspace-state";

describe("appliance workspace state", () => {
  it("starts empty without a saved labelled workspace", () => {
    expect(storedApplianceWorkspaceMode(undefined, 0)).toBe("empty");
    expect(storedApplianceWorkspaceMode(undefined, 3)).toBe("empty");
  });

  it("keeps sample and user profiles distinct", () => {
    expect(storedApplianceWorkspaceMode("sample", 3)).toBe("sample");
    expect(storedApplianceWorkspaceMode("user", 3)).toBe("user");
    expect(applianceSourceLabel("sample")).toBe("คำนวณจากอุปกรณ์ตัวอย่าง");
    expect(applianceSourceLabel("user")).toBe("คำนวณจากรายการของคุณ");
  });
});
