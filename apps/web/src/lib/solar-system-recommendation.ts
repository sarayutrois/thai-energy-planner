import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import type { SolarAssumptionSettings } from "./solar-assumptions";

export type SolarSystemRecommendation = {
  verdict: "recommend" | "consider" | "not_recommended";
  verdictLabel: string;
  headline: string;
  systemType: "on_grid" | "hybrid" | "not_recommended";
  systemTypeLabel: string;
  systemSizeKwp: number | null;
  panelWatt: number | null;
  panelCount: number | null;
  inverterSizeKw: number | null;
  batteryRecommended: boolean;
  batteryUsableKwh: number | null;
  batteryLabel: string;
  budgetLowThb: number | null;
  budgetHighThb: number | null;
  solarOnlyPaybackYears: number | null;
  combinedPaybackLabel: string;
  confidence: "low" | "medium" | "high";
  confidenceLabel: string;
  reasons: string[];
  limitations: string[];
  nextAction: string;
};

export function buildSolarSystemRecommendation(input: {
  analysis: SolarAnalysisResult;
  settings: SolarAssumptionSettings;
  hasCalibratedBills: boolean;
  dataTrustLevel?: "low" | "medium" | "high";
}): SolarSystemRecommendation {
  const { analysis, settings } = input;
  const recommended = analysis.sizing.recommended;
  const modelScore = finiteOr(analysis.modelQuality?.score, 0);
  const confidence = getConfidence(
    modelScore,
    input.hasCalibratedBills,
    input.dataTrustLevel,
  );
  const backupRequirementConfirmed = settings.backupRequirement !== "unknown";

  if (!recommended) {
    return {
      verdict: "not_recommended",
      verdictLabel: "ยังไม่แนะนำ",
      headline: "ยังไม่ควรติดตั้งจากข้อมูลชุดนี้",
      systemType: "not_recommended",
      systemTypeLabel: "ยังไม่แนะนำระบบ",
      systemSizeKwp: null,
      panelWatt: null,
      panelCount: null,
      inverterSizeKw: null,
      batteryRecommended: false,
      batteryUsableKwh: null,
      batteryLabel: "ไม่แนะนำ เพราะ Solar ฐานยังไม่ผ่านเกณฑ์ความคุ้มค่า",
      budgetLowThb: null,
      budgetHighThb: null,
      solarOnlyPaybackYears: null,
      combinedPaybackLabel: "ยังไม่มีขนาดที่คืนทุนภายในอายุโครงการ",
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      reasons: [
        `ระบบลองขนาด 0.5–${formatNumber(analysis.sizing.constraints.appliedMaxKwp)} kWp แล้ว แต่ยังไม่มีขนาดที่ทั้ง NPV เป็นบวกและคืนทุนภายในอายุโครงการ`,
        `Solar ที่จำลองถูกใช้ภายในสถานที่ประมาณ ${formatNumber(finiteOr(analysis.selfConsumption.selfConsumptionRatio, 0) * 100)}%`,
      ],
      limitations: buildBaseLimitations({
        analysis,
        hasCalibratedBills: input.hasCalibratedBills,
        ...(input.dataTrustLevel === undefined
          ? {}
          : { dataTrustLevel: input.dataTrustLevel }),
      }),
      nextAction:
        "เพิ่มข้อมูลบิลและการใช้ไฟช่วงกลางวัน ตรวจเงาบัง แล้วลองประเมินใหม่ก่อนขอใบเสนอราคา",
    };
  }

  const systemSizeKwp = recommended.systemSizeKwp;
  const panelWatt = finiteOr(
    analysis.solarProfile.assumptionsSnapshot.panelWatt,
    550,
  );
  const panelCount = Math.max(
    1,
    Math.round((systemSizeKwp * 1_000) / panelWatt),
  );
  const inverterSizeKw = selectInverterSize(systemSizeKwp);
  const needsBackup = settings.backupRequirement === "essential";
  const batteryUsableKwh = needsBackup
    ? roundBatteryModule(
        (settings.essentialLoadKw * settings.backupHours) / 0.9,
      )
    : null;
  const fallbackCapex =
    settings.systemSizeKwp > 0
      ? settings.capexThb * (systemSizeKwp / settings.systemSizeKwp)
      : settings.capexThb;
  const solarCapex = finiteOr(recommended.capexThb, fallbackCapex);
  const hybridUpgradeCost = needsBackup
    ? batteryUsableKwh! * settings.batteryCostPerKwhThb +
      Math.max(25_000, inverterSizeKw * 4_000)
    : 0;
  const budgetMidpoint = solarCapex + hybridUpgradeCost;
  const budgetLowThb = roundMoney(budgetMidpoint * 0.9);
  const budgetHighThb = roundMoney(budgetMidpoint * 1.15);
  const payback = finiteOrNull(recommended.simplePaybackYears);
  const isReadyToRecommend =
    confidence === "high" &&
    backupRequirementConfirmed &&
    finiteOr(recommended.npvThb, 1) > 0;
  const verdict = isReadyToRecommend ? "recommend" : "consider";
  const systemType = needsBackup ? "hybrid" : "on_grid";
  const baseLimitations = buildBaseLimitations({
    analysis,
    hasCalibratedBills: input.hasCalibratedBills,
    ...(input.dataTrustLevel === undefined
      ? {}
      : { dataTrustLevel: input.dataTrustLevel }),
  });

  return {
    verdict,
    verdictLabel: isReadyToRecommend ? "ควรติด" : "ควรพิจารณา",
    headline: isReadyToRecommend
      ? `ควรติด Solar แบบ ${needsBackup ? "Hybrid" : "On-grid"}`
      : `มีแนวโน้มเหมาะกับระบบ ${needsBackup ? "Hybrid" : "On-grid"} แต่ควรยืนยันข้อมูลก่อนลงทุน`,
    systemType,
    systemTypeLabel: needsBackup
      ? "Hybrid — มีไฟสำรองสำหรับโหลดจำเป็น"
      : backupRequirementConfirmed
        ? "On-grid — เน้นลดค่าไฟและคืนทุน"
        : "On-grid เบื้องต้น — รอยืนยันเรื่องไฟสำรอง",
    systemSizeKwp,
    panelWatt,
    panelCount,
    inverterSizeKw,
    batteryRecommended: needsBackup,
    batteryUsableKwh,
    batteryLabel: needsBackup
      ? `ควรมีประมาณ ${formatNumber(batteryUsableKwh!)} kWh เพื่อสำรองโหลด ${formatNumber(settings.essentialLoadKw)} kW นาน ${formatNumber(settings.backupHours)} ชั่วโมง`
      : backupRequirementConfirmed
        ? "ยังไม่ควรมี หากเป้าหมายหลักคือลดค่าไฟและคืนทุนเร็ว"
        : "ยังสรุปไม่ได้จนกว่าจะยืนยันความต้องการไฟสำรอง",
    budgetLowThb,
    budgetHighThb,
    solarOnlyPaybackYears: payback,
    combinedPaybackLabel: needsBackup
      ? `${payback === null ? "Solar ยังไม่มีระยะคืนทุน" : `ส่วน Solar คืนทุนประมาณ ${formatNumber(payback)} ปี`} · ระบบรวมแบตต้องจำลองการใช้งาน Battery เพิ่ม`
      : payback === null
        ? "ยังไม่คืนทุนภายในอายุโครงการ"
        : `ประมาณ ${formatNumber(payback)} ปี`,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    reasons: [
      `ขนาด ${formatNumber(systemSizeKwp)} kWp เป็นตัวเลือก NPV สูงสุดในกลุ่มที่คืนทุนภายในอายุโครงการ`,
      `คาดว่าจะใช้ไฟ Solar ภายในสถานที่ประมาณ ${formatNumber(finiteOr(analysis.selfConsumption.selfConsumptionRatio, 0) * 100)}%`,
      needsBackup
        ? "เลือก Hybrid เพราะระบุว่าต้องการไฟสำรองสำหรับอุปกรณ์จำเป็น"
        : backupRequirementConfirmed
          ? "เลือก On-grid เพราะยืนยันว่าไม่ต้องการไฟสำรอง จึงไม่เพิ่มต้นทุนแบตเตอรี่โดยไม่จำเป็น"
          : "ใช้ On-grid เป็นคำตอบเบื้องต้น เพราะยังไม่ได้ยืนยันว่าต้องการไฟสำรองหรือไม่",
    ],
    limitations: [
      ...baseLimitations,
      ...(!backupRequirementConfirmed
        ? [
            "ยังไม่ได้ยืนยันความต้องการไฟสำรอง กรุณาตอบคำถามนี้ก่อนใช้ผลเลือก On-grid หรือ Hybrid",
          ]
        : []),
      `จำนวนแผงคำนวณจากแผง ${formatNumber(panelWatt)} W และขนาด Inverter เป็นขนาดคัดกรองเบื้องต้น`,
      ...(needsBackup
        ? [
            `งบ Hybrid ใช้ค่าประมาณแบตเตอรี่ ${formatNumber(settings.batteryCostPerKwhThb)} บาท/kWh และเผื่ออุปกรณ์สำรองไฟ ยังไม่ใช่ใบเสนอราคา`,
            ...(settings.defaultedFields.includes("essentialLoadKw") ||
            settings.defaultedFields.includes("backupHours")
              ? [
                  "ขนาดแบตเตอรี่ยังใช้ค่าโหลดจำเป็นและชั่วโมงสำรองเริ่มต้นของระบบ ควรแก้ให้ตรงกับอุปกรณ์จริง",
                ]
              : []),
            "ระยะคืนทุนรวมแบตยังไม่คำนวณ เพราะต้องรู้รูปแบบชาร์จ–คายประจุ อายุแบต และมูลค่าความเสียหายจากไฟดับ",
          ]
        : [
            "ยังไม่ได้ประเมินความคุ้มค่าของแบตเตอรี่สำหรับย้ายพลังงานไปช่วงกลางคืน จึงไม่แนะนำแบตจากสมมติฐานค่าไฟเพียงอย่างเดียว",
          ]),
    ],
    nextAction: needsBackup
      ? "ให้ผู้ติดตั้งสำรวจโหลดสำรอง แยกวงจรไฟจำเป็น และเสนอราคา Hybrid พร้อมแบตเตอรี่ตามขนาดนี้"
      : "ใช้สเปกนี้เป็นจุดเริ่มต้นขอใบเสนอราคา On-grid และยืนยันหลังคา เงาบัง ระบบไฟ และสิทธิส่งไฟกลับ",
  };
}

function buildBaseLimitations(input: {
  analysis: SolarAnalysisResult;
  hasCalibratedBills: boolean;
  dataTrustLevel?: "low" | "medium" | "high";
}) {
  const limitations = [
    "ต้องสำรวจพื้นที่หลังคา เงาบัง โครงสร้าง ระบบไฟ 1/3 เฟส และเงื่อนไขเชื่อมต่อกับการไฟฟ้าก่อนติดตั้งจริง",
  ];
  if (!input.hasCalibratedBills)
    limitations.push(
      "Load Profile ยังไม่ได้ยืนยันด้วยบิล จึงควรเพิ่มบิลอย่างน้อย 3 เดือนก่อนตัดสินใจลงทุน",
    );
  if (finiteOr(input.analysis.modelQuality?.score, 0) < 60)
    limitations.push(
      "คุณภาพข้อมูลของแบบจำลองยังไม่สูง ผลขนาดระบบและงบอาจเปลี่ยนเมื่อมีข้อมูลหน้างาน",
    );
  if (input.dataTrustLevel === "low")
    limitations.push(
      "คะแนนความน่าเชื่อถือของข้อมูลอยู่ในระดับต่ำ จึงยังไม่ควรยืนยันขนาดระบบหรือวงเงินลงทุน",
    );
  return limitations;
}

function getConfidence(
  modelScore: number,
  hasCalibratedBills: boolean,
  dataTrustLevel?: "low" | "medium" | "high",
): "low" | "medium" | "high" {
  if (dataTrustLevel === "low") return "low";
  if (dataTrustLevel === "medium")
    return modelScore >= 45 || hasCalibratedBills ? "medium" : "low";
  if (modelScore >= 60 && hasCalibratedBills) return "high";
  if (modelScore >= 45 || hasCalibratedBills) return "medium";
  return "low";
}

function confidenceLabel(confidence: "low" | "medium" | "high") {
  return confidence === "high"
    ? "ความมั่นใจสูง"
    : confidence === "medium"
      ? "ความมั่นใจปานกลาง"
      : "ความมั่นใจต่ำ";
}

function selectInverterSize(systemSizeKwp: number) {
  const target = systemSizeKwp * 0.9;
  const standardSizes = [1, 1.5, 2, 3, 3.6, 4, 5, 6, 8, 10, 12, 15, 20];
  return standardSizes.find((size) => size >= target) ?? Math.ceil(target);
}

function roundBatteryModule(value: number) {
  return Math.max(5, Math.ceil(value / 5) * 5);
}

function finiteOr(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? value! : fallback;
}

function finiteOrNull(value: number | null | undefined) {
  return value !== null && Number.isFinite(value) ? value! : null;
}

function roundMoney(value: number) {
  return Math.round(value / 1_000) * 1_000;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(
    value,
  );
}
