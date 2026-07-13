import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";

const billWorkspaceKey = "thai-energy-planner.bill-workspace.v1";
const applianceWorkspaceKey = "thai-energy-planner.appliance-workspace.v3";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), billWorkspaceKey);
  await page.evaluate((key) => window.localStorage.removeItem(key), applianceWorkspaceKey);
});

test("query context keeps Bills and Appliances on the same empty-state flow", async ({ page }) => {
  const billUrls = ["/analysis/load-data/bills", "/analysis/load-data/bills?audience=home&source=bills"];
  for (const url of billUrls) {
    await page.goto(url);
    const content = await page.locator("main").innerText();
    expect(content).toContain("ยังไม่มีข้อมูลค่าไฟ");
    await expect(page.getByText("จำนวนเดือน").locator("..")).toContainText("0");
    expect(content).toContain("ยังประเมินไม่ได้");
    expect(content).not.toContain("Manual Bill Input");
    expect(content).not.toContain("Battery");
    expect(content).not.toContain("EV");
  }

  const applianceUrls = ["/analysis/load-data/appliances", "/analysis/load-data/appliances?audience=home&source=appliances"];
  for (const url of applianceUrls) {
    await page.goto(url);
    const content = await page.locator("main").innerText();
    expect(content).toContain("ยังไม่มีอุปกรณ์");
    expect(content).toContain("ยังประเมินไม่ได้");
    expect(content).not.toContain("Battery");
    expect(content).not.toContain("EV");
  }
});

test("legacy analysis entry redirects to the start flow", async ({ page }) => {
  await page.goto("/analysis");
  await page.waitForURL("**/analysis/new");
  await expect(page.getByRole("heading", { name: "เริ่มวิเคราะห์ค่าไฟแบบไม่ต้องรู้เทคนิคก่อน" })).toBeVisible();
});

test("Flow A: user without data sees no fabricated KPI or export", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await expect(page.getByRole("heading", { name: "ยังไม่มีข้อมูลค่าไฟ" })).toBeVisible();
  await expect(page.getByText("จำนวนเดือน").locator("..")).toContainText("0");

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
  await expect(page.getByText("จำนวนเดือน").locator("..")).toContainText("0");
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
  await expect(page.getByRole("main").getByText("Solar", { exact: true })).toBeVisible();
  await expect(page.getByText("เปิดรายงานเพื่อส่งออก")).toBeVisible();

  await page.evaluate((key) => {
    const workspace = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    workspace.rows[0].totalCostThb = "2300";
    window.localStorage.setItem(key, JSON.stringify(workspace));
  }, billWorkspaceKey);
  await page.reload();
  await expect(page.getByText("ผลลัพธ์เดิมไม่ตรงกับข้อมูลปัจจุบัน")).toBeVisible();
});

test("production navigation uses Thai theme label and tariff route", async ({ page }) => {
  await page.goto("/analysis/scenarios");
  await expect(page.getByRole("button", { name: "สลับโหมดสี" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle theme" })).toHaveCount(0);

  const tariffLink = page.getByRole("link", { name: "ค่าไฟ" });
  await expect(tariffLink).toHaveAttribute("href", "/analysis/tariff");
  await page.goto("/analysis/tariff");
  await expect(page.getByRole("heading", { name: "ตรวจสอบอัตราค่าไฟที่ใช้คำนวณ" })).toBeVisible();
});

test("sample CSV downloads with the expected response headers", async ({ page }) => {
  await page.goto("/analysis/load-data/import");
  const downloadPromise = page.waitForEvent("download");
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/analysis/load-data/import/sample"));
  await page.getByRole("link", { name: "ดาวน์โหลด CSV ตัวอย่าง" }).click();
  const [download, response] = await Promise.all([downloadPromise, responsePromise]);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["content-disposition"]).toContain("attachment");
  expect(download.suggestedFilename()).toBe("thai-energy-planner-load-profile-sample.csv");
});

test("CSV and XLSX uploads keep column mapping and produce previews", async ({ page }) => {
  await page.goto("/analysis/load-data/import");
  await page.locator('input[type="file"]').setInputFiles("apps/web/public/test-upload-15min.csv");
  await expect(page.getByText("จำนวนแถว")).toBeVisible();
  await expect(page.getByText("พลังงานรวม (kWh)")).toBeVisible();
  await expect(page.getByRole("button", { name: "บันทึกข้อมูลนี้เพื่อใช้วิเคราะห์ Solar" })).toBeEnabled();

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["timestamp", "energy_kwh", "power_kw"],
    ["2026-07-01 09:00", 1, 1],
    ["2026-07-01 10:00", 1.2, 1.2],
  ]), "Load Profile");
  const xlsx = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "load-profile.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: xlsx,
  });
  await expect(page.getByText("จำนวนแถว").locator("..")).toContainText("2");
  await expect(page.getByRole("button", { name: "บันทึกข้อมูลนี้เพื่อใช้วิเคราะห์ Solar" })).toBeEnabled();
});

test("AI bill scanner connects a successful response to the bill workspace", async ({ page }) => {
  await page.route("**/api/bills/scan", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ month: "2026-06", energyKwh: 420, totalCostThb: 1810, authority: "PEA" }),
    });
  });
  await page.goto("/analysis/load-data/bills");
  const scannerInput = page.locator('input[accept="image/*,application/pdf"]');
  await scannerInput.setInputFiles({ name: "bill.png", mimeType: "image/png", buffer: Buffer.from("bill") });
  await expect(page.locator('input[type="month"][value="2026-06"]')).toBeVisible();
  await expect(page.locator('input[type="number"][value="420"]')).toBeVisible();
});

test("bill workspace exports and imports JSON and CSV", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await page.getByRole("button", { name: "ทดลองด้วยข้อมูลตัวอย่าง" }).first().click();

  for (const name of ["ส่งออก JSON", "ส่งออก CSV"]) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/thai-energy-planner-bills\.(json|csv)/);
  }

  await page.getByRole("button", { name: "เริ่มใหม่" }).click();
  await page.locator('input[accept="application/json,text/csv,.json,.csv"]').setInputFiles({
    name: "bills.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      audience: "home",
      mode: "user",
      rows: [{ id: "imported", month: "2026-05", energyKwh: "350", totalCostThb: "1500", authority: "PEA", meterMode: "normal" }],
      updatedAt: new Date().toISOString(),
    })),
  });
  await expect(page.locator('input[type="month"][value="2026-05"]')).toBeVisible();
  await expect(page.locator('input[type="number"][value="350"]')).toBeVisible();
});

test("saved bill report exports all formats and invokes print", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({
    audience: "home",
    mode: "user",
    updatedAt: new Date().toISOString(),
    rows: [{ id: "report-bill", month: "2026-05", energyKwh: "350", totalCostThb: "1500", authority: "PEA", meterMode: "normal" }],
  })), billWorkspaceKey);
  await page.reload();
  await page.getByRole("button", { name: "สร้างรายงานจากบิลนี้" }).click();

  for (const name of ["ดาวน์โหลด PDF", "ดาวน์โหลด JSON", "ดาวน์โหลด CSV"]) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(pdf|json|csv)$/);
  }

  await page.evaluate(() => {
    window.print = () => document.documentElement.setAttribute("data-print-called", "true");
  });
  await page.getByRole("button", { name: "พิมพ์" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-called", "true");
});
