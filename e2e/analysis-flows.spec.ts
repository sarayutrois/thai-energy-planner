import { expect, test } from "@playwright/test";

const billWorkspaceKey = "thai-energy-planner.bill-workspace.v1";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), billWorkspaceKey);
});

test("legacy analysis entry redirects to the start flow", async ({ page }) => {
  await page.goto("/analysis");
  await page.waitForURL("**/analysis/new");
  await expect(page.getByRole("heading", { name: "เริ่มวิเคราะห์ค่าไฟแบบไม่ต้องรู้เทคนิคก่อน" })).toBeVisible();
});

test("Flow A: user without data sees no fabricated KPI or export", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await expect(page.getByRole("heading", { name: "ยังไม่มีข้อมูลค่าไฟ" })).toBeVisible();
  await expect(page.getByText("จำนวนเดือน").locator("..")).toContainText("N/A");

  await page.goto("/analysis/scenarios");
  await expect(page.getByRole("heading", { name: "ยังไม่มี Load Profile สำหรับเปรียบเทียบ" })).toBeVisible();

  await page.goto("/analysis/reports");
  await expect(page.getByText("ยังไม่มีข้อมูลสำหรับสร้างรายงาน")).toBeVisible();
  await expect(page.getByText("ยัง export ไม่ได้:")).toBeVisible();
});

test("Flow B: sample bills are labelled and do not become user data", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await page.getByRole("button", { name: "ทดลองด้วยข้อมูลตัวอย่าง" }).first().click();
  await expect(page.getByText("ข้อมูลตัวอย่างบ้าน — ตัวเลขเหล่านี้ยังไม่ใช่ข้อมูลค่าไฟของคุณ")).toBeVisible();
  await expect(page.getByText("ข้อมูลตัวอย่าง", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("ข้อมูลตัวอย่างบ้าน — ตัวเลขเหล่านี้ยังไม่ใช่ข้อมูลค่าไฟของคุณ")).toBeVisible();

  await page.goto("/analysis/reports");
  await expect(page.getByText("กำลังใช้ข้อมูลบิลตัวอย่าง")).toBeVisible();
  await expect(page.getByText("ยัง export ไม่ได้:")).toBeVisible();
});

test("invalid saved bills fall back to an empty workspace", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await page.evaluate((key) => window.localStorage.setItem(key, "{not-json"), billWorkspaceKey);
  await page.reload();

  await expect(page.getByRole("heading", { name: "ยังไม่มีข้อมูลค่าไฟ" })).toBeVisible();
  await expect(page.getByText("จำนวนเดือน").locator("..")).toContainText("N/A");
});

test("Flow C: user bills and a saved Load Profile produce current reports", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({
    audience: "home",
    mode: "user",
    updatedAt: new Date().toISOString(),
    rows: [{ id: "user-bill-1", month: "2026-01", energyKwh: "500", totalCostThb: "2200", authority: "PEA", meterMode: "normal" }],
  })), billWorkspaceKey);
  await page.reload();
  await expect(page.getByText("500 kWh", { exact: true })).toBeVisible();

  await page.goto("/analysis/load-data/appliances");
  await page.getByRole("button", { name: "บ้านเล็ก 1 ห้องนอน แอร์ 1 เครื่อง ตู้เย็น ทีวี ไฟ และเครื่องครัวพื้นฐาน" }).click();
  await page.getByRole("button", { name: "ใช้ชุดนี้เป็นจุดเริ่มต้น" }).click();
  await page.getByRole("button", { name: "บันทึก Load Profile" }).click();

  await page.goto("/analysis/scenarios");
  await expect(page.getByRole("heading", { name: "เปรียบเทียบจาก Load Profile ที่บันทึกไว้" })).toBeVisible();
  await page.getByRole("button", { name: "บันทึกเป็นรายงาน" }).click();

  await page.goto("/analysis/solar");
  await expect(page.getByRole("heading", { name: "ผลการประเมิน Solar จากข้อมูลที่เลือก" })).toBeVisible();
  await expect(page.getByRole("button", { name: "บันทึกเป็นรายงาน" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "บันทึกเป็นรายงาน" }).click();

  await page.goto("/analysis/reports");
  await expect(page.getByText("Normal / TOU")).toBeVisible();
  await expect(page.getByText("Solar", { exact: true })).toBeVisible();
  await expect(page.getByText("เปิดรายงานเพื่อส่งออก")).toBeVisible();

  await page.evaluate((key) => {
    const workspace = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    workspace.rows[0].totalCostThb = "2300";
    window.localStorage.setItem(key, JSON.stringify(workspace));
  }, billWorkspaceKey);
  await page.reload();
  await expect(page.getByText("ผลลัพธ์เดิมไม่ตรงกับข้อมูลปัจจุบัน")).toBeVisible();
});
