import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";

const billWorkspaceKey = "thai-energy-planner.bill-workspace.v1";
const applianceWorkspaceKey = "thai-energy-planner.appliance-workspace.v3";
const analysisGoalKey = "thai-energy-planner.analysis-goal.v1";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    (key) => window.localStorage.removeItem(key),
    billWorkspaceKey,
  );
  await page.evaluate(
    (key) => window.localStorage.removeItem(key),
    applianceWorkspaceKey,
  );
  await page.evaluate(
    (key) => window.localStorage.removeItem(key),
    analysisGoalKey,
  );
});

test("query context keeps Bills and Appliances on the same empty-state flow", async ({
  page,
}) => {
  const billUrls = [
    "/analysis/load-data/bills",
    "/analysis/load-data/bills?audience=home&source=bills",
  ];
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

  const applianceUrls = [
    "/analysis/load-data/appliances",
    "/analysis/load-data/appliances?audience=home&source=appliances",
  ];
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
  await expect(
    page.getByRole("heading", {
      name: "เริ่มวิเคราะห์ค่าไฟแบบไม่ต้องรู้เทคนิคก่อน",
    }),
  ).toBeVisible();
});

test("legacy deep links redirect into the supported user journeys", async ({
  page,
}) => {
  for (const path of [
    "/analysis/scenarios/new",
    "/analysis/scenarios/compare",
    "/analysis/scenarios/results",
  ]) {
    await page.goto(path);
    await page.waitForURL("**/analysis/scenarios");
    await expect(
      page.getByRole("heading", {
        name: "เปรียบเทียบค่าไฟจากรูปแบบการใช้ไฟของคุณ",
      }),
    ).toBeVisible();
  }

  await page.goto("/estimate");
  await page.waitForURL("**/analysis/new");
  await expect(
    page.getByRole("heading", {
      name: "เริ่มวิเคราะห์ค่าไฟแบบไม่ต้องรู้เทคนิคก่อน",
    }),
  ).toBeVisible();
});

test("solar starts with data review and no automatic result", async ({
  page,
}) => {
  await page.goto("/analysis/solar");
  await expect(
    page.getByRole("heading", { name: "จำลองการติดตั้งโซลาร์เซลล์บนหลังคา" }),
  ).toBeVisible();
  await expect(
    page.getByText("1. ข้อมูลประเมิน", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("2. สมมติฐาน", { exact: true })).toBeVisible();
  await expect(page.getByText("3. ผลการประเมิน", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", {
      name: "ผลการประเมิน Solar จากข้อมูลที่เลือก",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "เริ่มประเมิน Solar" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "2. สมมติฐาน" }).click();
  await expect(
    page.getByRole("button", { name: "ยืนยันสมมติฐานและดูผล" }),
  ).toBeVisible();
  await expect(page.getByText("3. ผลการประเมิน", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("รูปแบบค่าไฟที่เหมาะหลังติด Solar")).toHaveCount(
    0,
  );
  await expect(page.getByText("ขั้นตอนที่ 3 จาก 4")).toHaveCount(0);
});

test("home hero uses the Solar footage with an accessible playback control", async ({
  page,
}) => {
  await page.goto("/");
  const video = page.getByTestId("solar-hero-video");
  await expect(video).toHaveCount(1);
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute(
    "src",
    "/solarcell.mp4",
  );
  await expect(video).toHaveAttribute("poster", "/solarcell-poster.jpg");

  const toggle = page.getByTestId("hero-video-toggle");
  await expect(toggle).toHaveAttribute("aria-label", "หยุดวิดีโอพื้นหลัง");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-label", "เล่นวิดีโอพื้นหลัง");
});

test.describe("home hero reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the Solar poster and manual playback available", async ({
    page,
  }) => {
    await page.goto("/");
    const video = page.getByTestId("solar-hero-video");
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute("poster", "/solarcell-poster.jpg");

    const toggle = page.getByTestId("hero-video-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-label", "เล่นวิดีโอพื้นหลัง");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "หยุดวิดีโอพื้นหลัง");
  });
});

test("Flow A: user without data sees no fabricated KPI or export", async ({
  page,
}) => {
  await page.goto("/analysis/load-data/bills");
  await expect(
    page.getByRole("heading", { name: "ยังไม่มีข้อมูลค่าไฟ" }),
  ).toBeVisible();
  await expect(page.getByText("จำนวนเดือน").locator("..")).toContainText("0");

  await page.goto("/analysis/scenarios");
  await expect(
    page.getByRole("heading", {
      name: "ยังไม่มี Load Profile สำหรับเปรียบเทียบ",
    }),
  ).toBeVisible();

  await page.goto("/analysis/reports");
  await expect(page.getByText("ยังไม่มีข้อมูลสำหรับสร้างรายงาน")).toBeVisible();
  await expect(page.getByText("ยัง export ไม่ได้:")).toBeVisible();
});

test("Flow B: sample bills are labelled and do not become user data", async ({
  page,
}) => {
  await page.goto("/analysis/load-data/bills");
  await page
    .getByRole("button", { name: "ทดลองด้วยข้อมูลตัวอย่าง" })
    .first()
    .click();
  await expect(
    page.getByText(
      "ข้อมูลตัวอย่างบ้าน — ตัวเลขเหล่านี้ยังไม่ใช่ข้อมูลค่าไฟของคุณ",
    ),
  ).toBeVisible();
  await expect(page.getByText("ข้อมูลตัวอย่าง", { exact: true })).toBeVisible();

  await page.reload();
  await expect(
    page.getByText(
      "ข้อมูลตัวอย่างบ้าน — ตัวเลขเหล่านี้ยังไม่ใช่ข้อมูลค่าไฟของคุณ",
    ),
  ).toBeVisible();

  await page.goto("/analysis/reports");
  await expect(page.getByText("กำลังใช้ข้อมูลบิลตัวอย่าง")).toBeVisible();
  await expect(page.getByText("ยัง export ไม่ได้:")).toBeVisible();
});

test("invalid saved bills fall back to an empty workspace", async ({
  page,
}) => {
  await page.goto("/analysis/load-data/bills");
  await page.evaluate(
    (key) => window.localStorage.setItem(key, "{not-json"),
    billWorkspaceKey,
  );
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "ยังไม่มีข้อมูลค่าไฟ" }),
  ).toBeVisible();
  await expect(page.getByText("จำนวนเดือน").locator("..")).toContainText("0");
});

test("Flow C: user bills and a saved Load Profile produce current reports", async ({
  page,
}) => {
  await page.goto("/analysis/load-data/bills");
  await page.evaluate(
    (key) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({
          audience: "home",
          mode: "user",
          updatedAt: new Date().toISOString(),
          rows: [
            {
              id: "user-bill-1",
              month: "2026-01",
              energyKwh: "500",
              totalCostThb: "2200",
              authority: "PEA",
              meterMode: "normal",
            },
          ],
        }),
      ),
    billWorkspaceKey,
  );
  await page.reload();
  await expect(page.getByText("500 kWh", { exact: true })).toBeVisible();

  await page.goto("/analysis/load-data/appliances");
  await page
    .getByRole("button", {
      name: "บ้านเล็ก 1 ห้องนอน แอร์ 1 เครื่อง ตู้เย็น ทีวี ไฟ และเครื่องครัวพื้นฐาน",
    })
    .click();
  await page.getByRole("button", { name: "ใช้ชุดนี้เป็นจุดเริ่มต้น" }).click();
  await page.getByRole("button", { name: "บันทึก Load Profile" }).click();

  await page.goto("/analysis/scenarios");
  await expect(
    page.getByRole("heading", {
      name: "เปรียบเทียบจาก Load Profile ที่บันทึกไว้",
    }),
  ).toBeVisible();
  const decisionAnswer = page.getByRole("region", {
    name: "คำตอบหลักจากผลการวิเคราะห์",
  });
  await expect(decisionAnswer).toBeVisible();
  await expect(decisionAnswer.getByText("คำตอบหลักของคุณ")).toBeVisible();
  await expect(decisionAnswer.getByText("ตัวเลขที่ยืนยันคำตอบ")).toBeVisible();
  await expect(decisionAnswer.getByText("ขั้นตอนถัดไป")).toBeVisible();
  await expect(decisionAnswer).not.toContainText("THB/month");
  await expect(decisionAnswer).not.toContainText(
    "Interval data is shorter than 30 days",
  );
  await page.getByRole("button", { name: "บันทึกเป็นรายงาน" }).click();

  await page.goto("/analysis/solar");
  await expect(
    page.getByRole("heading", { name: "ตรวจข้อมูลก่อนเริ่มประเมิน Solar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ผลการประเมิน Solar จากข้อมูลที่เลือก" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "เริ่มประเมิน Solar" }).click();
  await expect(
    page.getByRole("heading", { name: "ผลการประเมิน Solar จากข้อมูลที่เลือก" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("button", { name: "บันทึกเป็นรายงาน" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "บันทึกเป็นรายงาน" }).click();

  await page.goto("/analysis/reports");
  await expect(
    page.getByRole("heading", { name: "สถานะรายงานปัจจุบัน" }),
  ).toBeVisible();
  await expect(page.getByText("Normal / TOU", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Solar", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("เปิดรายงานเพื่อส่งออก")).toBeVisible();

  await page.evaluate((key) => {
    const workspace = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    workspace.rows[0].totalCostThb = "2300";
    window.localStorage.setItem(key, JSON.stringify(workspace));
  }, billWorkspaceKey);
  await page.reload();
  await expect(
    page.getByText("ผลลัพธ์เดิมไม่ตรงกับข้อมูลปัจจุบัน"),
  ).toBeVisible();
});

test("production navigation uses Thai theme label and tariff route", async ({
  page,
}) => {
  await page.goto("/analysis/scenarios");
  await expect(page.getByRole("button", { name: "สลับโหมดสี" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle theme" })).toHaveCount(
    0,
  );

  const tariffLink = page.locator('header a[href="/analysis/tariff"]');
  await expect(tariffLink).toHaveAttribute("href", "/analysis/tariff");
  await page.goto("/analysis/tariff");
  await expect(
    page.getByRole("heading", { name: "ตรวจสอบอัตราค่าไฟที่ใช้คำนวณ" }),
  ).toBeVisible();
});

test("the guided start and data hub share one production navigation", async ({
  page,
}) => {
  for (const path of [
    "/analysis/new",
    "/analysis/load-data",
    "/analysis/load-data/appliances",
  ]) {
    await page.goto(path);

    const header = page.locator("header");
    await expect(
      header.locator('nav[aria-label="เมนูหลัก"] > div'),
    ).toHaveCount(5);
    await expect(header.locator('a[href="/analysis/battery"]')).toHaveCount(0);
    await expect(header.locator('a[href="/analysis/ev"]')).toHaveCount(0);
    await expect(header.locator('a[href="/analysis/ecosystem"]')).toHaveCount(
      0,
    );

    const content = await page.locator("main").innerText();
    expect(content).not.toContain("Phase 3");
    expect(content).not.toContain("เปิดหน้าทดสอบ");
    expect(content).not.toContain("ขั้นตอนที่ 1 จาก 4");
  }
});

test("start flow supports keyboard focus and a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/analysis/new");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "ข้ามไปเนื้อหาหลัก" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  const selectedChoices = page.locator('button[aria-pressed="true"]');
  await expect(selectedChoices).toHaveCount(2);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.goto("/analysis/solar");
  await expect(
    page.locator(
      'nav[aria-label="ส่วนการวิเคราะห์ Solar"] a[aria-current="page"]',
    ),
  ).toHaveCount(1);
});

test("the guided journey creates a load profile before collecting bills", async ({
  page,
}) => {
  await page.goto("/analysis/new");
  const primaryStart = page.getByRole("link", {
    name: "สร้างรูปแบบการใช้ไฟ",
    exact: true,
  });
  await expect(primaryStart).toHaveCount(1);
  await expect(primaryStart).toHaveAttribute(
    "href",
    /\/analysis\/load-data\/appliances/,
  );
  await expect(
    page.getByRole("heading", { name: "สร้างรูปแบบการใช้ไฟ" }),
  ).toBeVisible();
  const billAfterProfile = page.getByRole("link", {
    name: /เพิ่มบิลหลังมี Load Profile/,
  });
  await expect(billAfterProfile).toHaveAttribute(
    "href",
    /\/analysis\/load-data\/bills/,
  );
  const sectionOrder = await page.locator("h2").allTextContents();
  expect(sectionOrder.indexOf("สร้างรูปแบบการใช้ไฟ")).toBeLessThan(
    sectionOrder.indexOf("เพิ่มบิลเพื่อปรับความแม่นยำ"),
  );

  await page.goto("/analysis/load-data/appliances");
  const progress = page.locator('aside[aria-label="ความคืบหน้าการวิเคราะห์"]');
  const progressItems = progress.locator("ol > li");
  await expect(progressItems.nth(0)).toContainText("1. เริ่มต้น");
  await expect(progressItems.nth(1)).toContainText("2. รูปแบบการใช้ไฟ");
  await expect(progressItems.nth(2)).toContainText("3. บิลค่าไฟ");
  await expect(progressItems.nth(1).locator("a")).toHaveAttribute(
    "aria-current",
    "step",
  );

  await page.goto("/analysis/load-data/bills");
  await expect(progressItems.nth(2).locator("a")).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("each analysis goal prioritizes a distinct recommendation and destination", async ({
  page,
}) => {
  const cases = [
    {
      goal: "save",
      action: "ดูโอกาสลดค่าไฟ",
      recommendation: "ตั้งเป้าลดจากค่าใช้จ่ายเฉลี่ยปัจจุบัน",
      destination: "**/analysis/load-data/dashboard",
    },
    {
      goal: "tou",
      action: "เปรียบเทียบ Normal / TOU",
      recommendation: "ตรวจว่ามีโหลดช่วง Peak มากแค่ไหน",
      destination: "**/analysis/scenarios",
    },
    {
      goal: "solar",
      action: "ประเมินความคุ้มค่า Solar",
      recommendation: "ใช้ปริมาณไฟรวมเป็นกรอบขนาด Solar",
      destination: "**/analysis/solar?*",
    },
    {
      goal: "understand",
      action: "ดูภาพรวมการใช้ไฟ",
      recommendation: "เริ่มอธิบายจากเดือนที่ใช้ไฟสูงสุด 2026-06",
      destination: "**/analysis/load-data/dashboard",
    },
  ] as const;

  for (const item of cases) {
    await page.goto("/");
    await page.evaluate(
      ({ goalKey, billKey, goal }) => {
        window.localStorage.setItem(goalKey, goal);
        window.localStorage.setItem(
          billKey,
          JSON.stringify({
            audience: "home",
            mode: "user",
            rows: [
              {
                id: `goal-${goal}`,
                month: "2026-06",
                energyKwh: "420",
                totalCostThb: "1810",
                authority: "PEA",
                meterMode: "normal",
              },
            ],
            updatedAt: new Date().toISOString(),
          }),
        );
      },
      {
        goalKey: analysisGoalKey,
        billKey: billWorkspaceKey,
        goal: item.goal,
      },
    );

    await page.goto("/analysis/load-data/bills");
    await expect(
      page.getByText(item.recommendation, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: `บันทึกบิลแล้ว: ${item.action}`,
      })
      .click();
    await page.waitForURL(item.destination);
  }
});

test("experimental modules stay behind the unavailable boundary", async ({
  page,
  request,
}) => {
  for (const path of [
    "/analysis/battery",
    "/analysis/battery/config",
    "/analysis/ev",
    "/analysis/ev/results",
    "/analysis/ecosystem",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toContainText("กำลังปรับปรุง");
    await expect(
      page.locator('header a[href="/analysis/battery"]'),
    ).toHaveCount(0);
    await expect(page.locator('header a[href="/analysis/ev"]')).toHaveCount(0);
    await expect(
      page.locator('header a[href="/analysis/ecosystem"]'),
    ).toHaveCount(0);
  }

  for (const path of ["/api/battery/summarize", "/api/ev/summarize"]) {
    const response = await request.post(path, { data: {} });
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({
      error: "feature_unavailable",
    });
  }
});

test("Solar web-vital endpoint accepts only anonymous allow-listed metrics", async ({
  request,
}) => {
  const accepted = await request.post("/api/observability/web-vitals", {
    data: {
      path: "/analysis/solar",
      name: "LCP",
      value: 1_250.5,
      startTime: 0,
    },
  });
  expect(accepted.status()).toBe(204);

  const rejected = await request.post("/api/observability/web-vitals", {
    data: {
      path: "/analysis/solar",
      name: "user-energy-data",
      value: 1,
      startTime: 0,
    },
  });
  expect(rejected.status()).toBe(400);
  expect(await rejected.json()).toEqual({
    ok: false,
    error: "Invalid web vital payload.",
  });
});

test("sample CSV downloads with the expected response headers", async ({
  page,
}) => {
  await page.goto("/analysis/load-data/import");
  const downloadPromise = page.waitForEvent("download");
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/analysis/load-data/import/sample"),
  );
  await page.getByRole("link", { name: "ดาวน์โหลด CSV ตัวอย่าง" }).click();
  const [download, response] = await Promise.all([
    downloadPromise,
    responsePromise,
  ]);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["content-disposition"]).toContain("attachment");
  expect(download.suggestedFilename()).toBe(
    "thai-energy-planner-load-profile-sample.csv",
  );
});

test("CSV and XLSX uploads keep column mapping and produce previews", async ({
  page,
}) => {
  await page.goto("/analysis/load-data/import");
  await page
    .locator('input[type="file"]')
    .setInputFiles("apps/web/public/test-upload-15min.csv");
  await expect(page.getByText("จำนวนแถว")).toBeVisible();
  await expect(page.getByText("พลังงานรวม (kWh)")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "บันทึกข้อมูลนี้เพื่อใช้วิเคราะห์ Solar",
    }),
  ).toBeEnabled();

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["timestamp", "energy_kwh", "power_kw"],
      ["2026-07-01 09:00", 1, 1],
      ["2026-07-01 10:00", 1.2, 1.2],
    ]),
    "Load Profile",
  );
  const xlsx = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "load-profile.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: xlsx,
  });
  await expect(page.getByText("จำนวนแถว").locator("..")).toContainText("2");
  await expect(
    page.getByRole("button", {
      name: "บันทึกข้อมูลนี้เพื่อใช้วิเคราะห์ Solar",
    }),
  ).toBeEnabled();
});

test("AI bill scanner connects a successful response to the bill workspace", async ({
  page,
}) => {
  await page.route("**/api/bills/scan", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        month: "2026-06",
        energyKwh: 420,
        totalCostThb: 1810,
        authority: "PEA",
      }),
    });
  });
  await page.goto("/analysis/load-data/bills");
  const scannerInput = page.locator('input[accept="image/*,application/pdf"]');
  await scannerInput.setInputFiles({
    name: "bill.png",
    mimeType: "image/png",
    buffer: Buffer.from("bill"),
  });
  await expect(
    page.locator('input[type="month"][value="2026-06"]'),
  ).toBeVisible();
  await expect(page.locator('input[type="number"][value="420"]')).toBeVisible();
});

test("bill workspace exports and imports JSON and CSV", async ({ page }) => {
  await page.goto("/analysis/load-data/bills");
  await page
    .getByRole("button", { name: "ทดลองด้วยข้อมูลตัวอย่าง" })
    .first()
    .click();
  await page.getByText("นำเข้า ส่งออก และเครื่องมือ", { exact: true }).click();

  for (const name of ["ส่งออก JSON", "ส่งออก CSV"]) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /thai-energy-planner-bills\.(json|csv)/,
    );
  }

  await page.getByRole("button", { name: "เริ่มใหม่" }).click();
  await page
    .locator('input[accept="application/json,text/csv,.json,.csv"]')
    .setInputFiles({
      name: "bills.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          audience: "home",
          mode: "user",
          rows: [
            {
              id: "imported",
              month: "2026-05",
              energyKwh: "350",
              totalCostThb: "1500",
              authority: "PEA",
              meterMode: "normal",
            },
          ],
          updatedAt: new Date().toISOString(),
        }),
      ),
    });
  await expect(
    page.locator('input[type="month"][value="2026-05"]'),
  ).toBeVisible();
  await expect(page.locator('input[type="number"][value="350"]')).toBeVisible();
});

test("saved bill report exports all formats and invokes print", async ({
  page,
}) => {
  await page.goto("/analysis/load-data/bills");
  await page.evaluate(
    (key) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({
          audience: "home",
          mode: "user",
          updatedAt: new Date().toISOString(),
          rows: [
            {
              id: "report-bill",
              month: "2026-05",
              energyKwh: "350",
              totalCostThb: "1500",
              authority: "PEA",
              meterMode: "normal",
            },
          ],
        }),
      ),
    billWorkspaceKey,
  );
  await page.reload();
  await page.getByRole("button", { name: "สร้างรายงานจากบิลนี้" }).click();

  for (const name of ["ดาวน์โหลด PDF", "ดาวน์โหลด JSON", "ดาวน์โหลด CSV"]) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(pdf|json|csv)$/);
  }

  await page.evaluate(() => {
    window.print = () =>
      document.documentElement.setAttribute("data-print-called", "true");
  });
  await page.getByRole("button", { name: "พิมพ์" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-print-called",
    "true",
  );
});
