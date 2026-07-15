import type { BatteryMvpDecision } from "./battery-mvp";
import type { EvMvpDecision } from "./ev-mvp";

export type EcosystemReadinessStatus = "ready" | "missing" | "stale";

export type EcosystemModuleInput<T> = {
  status: EcosystemReadinessStatus;
  value: T | null;
};

export type EcosystemScenarioSummary = {
  annualSavingsThb: number;
  monthlyBillThb: number;
  recommendation: string;
};

export type EcosystemSolarSummary = {
  systemSizeKwp: number;
  initialInvestmentThb: number;
  annualBenefitThb: number;
  monthlyBillAfterSolarThb: number;
  simplePaybackYears: number | null;
  systemType: "on_grid" | "hybrid" | "not_recommended";
};

export type EcosystemPhase = {
  order: number;
  module: "scenario" | "solar" | "ev" | "battery";
  title: string;
  status: "do_now" | "next" | "optional" | "needs_data";
  statusLabel: string;
  action: string;
  budgetLowThb: number | null;
  budgetHighThb: number | null;
  annualImpactThb: number | null;
};

export type EcosystemPlan = {
  verdict: "ready" | "partial" | "needs_data";
  verdictLabel: string;
  headline: string;
  confidenceLabel: string;
  readyModuleCount: number;
  totalModuleCount: number;
  currentMonthlyBillThb: number | null;
  projectedMonthlyEnergyCostThb: number | null;
  primaryAnnualSavingsThb: number | null;
  evAnnualAddedCostThb: number | null;
  netAnnualChangeThb: number | null;
  knownBudgetLowThb: number | null;
  knownBudgetHighThb: number | null;
  blendedSimplePaybackYears: number | null;
  savingsSourceLabel: string | null;
  phases: EcosystemPhase[];
  limitations: string[];
};

export type EcosystemPlanInput = {
  currentMonthlyBillThb: number | null;
  hasLoadProfile: boolean;
  scenario: EcosystemModuleInput<EcosystemScenarioSummary>;
  solar: EcosystemModuleInput<EcosystemSolarSummary>;
  battery: EcosystemModuleInput<BatteryMvpDecision>;
  ev: EcosystemModuleInput<EvMvpDecision>;
};

export function buildEcosystemPlan(input: EcosystemPlanInput): EcosystemPlan {
  const modules = [input.scenario, input.solar, input.battery, input.ev];
  const readyModuleCount = modules.filter(
    (item) => item.status === "ready",
  ).length;
  const hasFoundation =
    input.currentMonthlyBillThb !== null && input.hasLoadProfile;
  const verdict = !hasFoundation
    ? "needs_data"
    : readyModuleCount >= 3
      ? "ready"
      : "partial";

  const scenarioSavings =
    input.scenario.status === "ready" && input.scenario.value
      ? Math.max(0, input.scenario.value.annualSavingsThb)
      : null;
  const solarSavings =
    input.solar.status === "ready" &&
    input.solar.value &&
    input.solar.value.systemType !== "not_recommended"
      ? Math.max(0, input.solar.value.annualBenefitThb)
      : null;

  // Scenario and Solar are both calculated from the same baseline profile. Use
  // only the strongest complete result so the summary never double-counts them.
  const primaryAnnualSavingsThb = maxNullable(scenarioSavings, solarSavings);
  const savingsSourceLabel =
    primaryAnnualSavingsThb === null
      ? null
      : solarSavings !== null && solarSavings >= (scenarioSavings ?? -1)
        ? "ผล Solar (รวมทางเลือกค่าไฟที่แบบจำลองเลือกแล้ว)"
        : "ผลเปรียบเทียบ Normal / TOU";
  const evAnnualAddedCostThb =
    input.ev.status === "ready" && input.ev.value
      ? Math.max(0, input.ev.value.monthlyBillIncreaseThb * 12)
      : null;
  const netAnnualChangeThb =
    primaryAnnualSavingsThb === null && evAnnualAddedCostThb === null
      ? null
      : (primaryAnnualSavingsThb ?? 0) - (evAnnualAddedCostThb ?? 0);
  const projectedMonthlyEnergyCostThb =
    input.currentMonthlyBillThb === null
      ? null
      : Math.max(
          0,
          input.currentMonthlyBillThb -
            (primaryAnnualSavingsThb ?? 0) / 12 +
            (evAnnualAddedCostThb ?? 0) / 12,
        );

  const solarBudget = recommendedSolarBudget(input.solar);
  const batteryBudget = recommendedBatteryBudget(input.battery);
  const knownBudgetLowThb = sumNullable(
    solarBudget,
    batteryBudget?.low ?? null,
  );
  const knownBudgetHighThb = sumNullable(
    solarBudget,
    batteryBudget?.high ?? null,
  );
  const blendedSimplePaybackYears =
    knownBudgetHighThb !== null &&
    primaryAnnualSavingsThb !== null &&
    primaryAnnualSavingsThb > 0 &&
    evAnnualAddedCostThb === null
      ? knownBudgetHighThb / primaryAnnualSavingsThb
      : input.solar.status === "ready" &&
          input.solar.value?.systemType !== "not_recommended"
        ? (input.solar.value?.simplePaybackYears ?? null)
        : null;

  return {
    verdict,
    verdictLabel:
      verdict === "ready"
        ? "พร้อมวางแผนเป็นลำดับ"
        : verdict === "partial"
          ? "วางแผนได้บางส่วน"
          : "ต้องเตรียมข้อมูลก่อน",
    headline:
      verdict === "ready"
        ? "เริ่มจากค่าไฟและ Solar ก่อน แล้วค่อยตัดสินใจ EV กับ Battery จากผลที่ยืนยันแล้ว"
        : verdict === "partial"
          ? "มีข้อมูลพอเริ่มตัดสินใจ แต่ควรเติมผลวิเคราะห์ที่ยังขาดก่อนสรุปงบทั้งระบบ"
          : "เพิ่มบิลและ Load Profile เพื่อให้ระบบจัดลำดับการลงทุนได้โดยไม่เดาตัวเลข",
    confidenceLabel:
      hasFoundation && readyModuleCount === 4
        ? "สูง"
        : hasFoundation && readyModuleCount >= 2
          ? "ปานกลาง"
          : "เริ่มต้น",
    readyModuleCount,
    totalModuleCount: 4,
    currentMonthlyBillThb: input.currentMonthlyBillThb,
    projectedMonthlyEnergyCostThb,
    primaryAnnualSavingsThb,
    evAnnualAddedCostThb,
    netAnnualChangeThb,
    knownBudgetLowThb,
    knownBudgetHighThb,
    blendedSimplePaybackYears,
    savingsSourceLabel,
    phases: buildPhases(input),
    limitations: buildLimitations(input, primaryAnnualSavingsThb),
  };
}

function buildPhases(input: EcosystemPlanInput): EcosystemPhase[] {
  const scenario = input.scenario.value;
  const solar = input.solar.value;
  const ev = input.ev.value;
  const battery = input.battery.value;

  return [
    {
      order: 1,
      module: "scenario",
      title: "จัดการโหลดและเลือกมิเตอร์",
      status: input.scenario.status === "ready" ? "do_now" : "needs_data",
      statusLabel:
        input.scenario.status === "ready"
          ? "ทำก่อน"
          : readinessLabel(input.scenario.status),
      action:
        input.scenario.status === "ready" && scenario
          ? scenario.recommendation
          : "คำนวณ Normal / TOU จาก Load Profile ปัจจุบัน",
      budgetLowThb: null,
      budgetHighThb: null,
      annualImpactThb: scenario?.annualSavingsThb ?? null,
    },
    {
      order: 2,
      module: "solar",
      title: "ติด Solar ตามขนาดที่ใช้เองได้",
      status:
        input.solar.status !== "ready"
          ? "needs_data"
          : solar?.systemType === "not_recommended"
            ? "optional"
            : "next",
      statusLabel:
        input.solar.status !== "ready"
          ? readinessLabel(input.solar.status)
          : solar?.systemType === "not_recommended"
            ? "ยังไม่แนะนำ"
            : "ลำดับถัดไป",
      action:
        input.solar.status === "ready" && solar
          ? solar.systemType === "not_recommended"
            ? "ยังไม่ลงทุน Solar ตามข้อมูลชุดนี้"
            : `${solar.systemType === "hybrid" ? "Hybrid" : "On-grid"} ${formatNumber(solar.systemSizeKwp)} kWp ก่อนขอใบเสนอราคา`
          : "คำนวณ Solar และยืนยันพื้นที่หลังคา",
      budgetLowThb: solarBudgetRange(solar)?.low ?? null,
      budgetHighThb: solarBudgetRange(solar)?.high ?? null,
      annualImpactThb:
        solar?.systemType === "not_recommended"
          ? null
          : (solar?.annualBenefitThb ?? null),
    },
    {
      order: 3,
      module: "ev",
      title: "วางแผนชาร์จ EV ให้ไม่สร้าง Peak ใหม่",
      status: input.ev.status === "ready" ? "next" : "needs_data",
      statusLabel:
        input.ev.status === "ready"
          ? "หลังจัดการมิเตอร์/โหลด"
          : readinessLabel(input.ev.status),
      action:
        input.ev.status === "ready" && ev
          ? `${ev.meterRecommendationLabel} · เครื่องชาร์จ ${formatNumber(ev.recommendedChargerPowerKw)} kW`
          : "กรอกระยะทางและช่วงเวลาที่รถจอดบ้าน",
      budgetLowThb: null,
      budgetHighThb: null,
      annualImpactThb: ev ? -Math.max(0, ev.monthlyBillIncreaseThb * 12) : null,
    },
    {
      order: 4,
      module: "battery",
      title: "ตัดสินใจ Battery เป็นขั้นสุดท้าย",
      status:
        input.battery.status !== "ready"
          ? "needs_data"
          : battery?.verdict === "recommend"
            ? "next"
            : "optional",
      statusLabel:
        input.battery.status !== "ready"
          ? readinessLabel(input.battery.status)
          : battery?.verdict === "recommend"
            ? "มีเหตุผลให้ลงทุน"
            : "ทางเลือก",
      action:
        input.battery.status === "ready" && battery
          ? `${battery.verdictLabel} · ${formatNumber(battery.capacityKwh)} kWh สำหรับ ${battery.strategyLabel}`
          : "ประเมิน Battery หลังยืนยัน Solar และรูปแบบชาร์จ EV",
      budgetLowThb: battery?.budgetLowThb ?? null,
      budgetHighThb: battery?.budgetHighThb ?? null,
      annualImpactThb: battery?.annualSavingsThb ?? null,
    },
  ];
}

function buildLimitations(
  input: EcosystemPlanInput,
  primaryAnnualSavingsThb: number | null,
) {
  const limitations = [
    "ตัวเลขผลประหยัดรวมเลือกผลฐานที่ดีที่สุดเพียงชุดเดียวระหว่าง Normal/TOU กับ Solar และไม่บวกผล Battery ซ้ำ",
    "งบรวมที่ทราบยังไม่รวมราคารถ EV, เครื่องชาร์จ, งานเพิ่มขนาดมิเตอร์, งานโครงสร้าง และใบเสนอราคาหน้างาน",
  ];
  if (input.ev.status === "ready")
    limitations.push(
      "ค่าไฟ EV แสดงเป็นโหลดเพิ่ม ไม่ถือเป็นผลประหยัดจากการเปลี่ยนรถและยังไม่เทียบค่าน้ำมัน",
    );
  if (input.battery.status === "ready")
    limitations.push(
      "ผล Battery ยังเป็นการประเมินแยก จึงแสดงใน Roadmap แต่ไม่รวมในค่าไฟสุทธิของระบบ",
    );
  if (primaryAnnualSavingsThb === null)
    limitations.push(
      "ยังไม่มีผล TOU หรือ Solar ที่เป็นปัจจุบัน จึงไม่แสดงเงินประหยัดรวม",
    );
  if (
    [input.scenario, input.solar, input.battery, input.ev].some(
      (item) => item.status === "stale",
    )
  )
    limitations.push(
      "มีผลบางโมดูลอ้างอิง Load Profile หรือชุดบิลเก่า ควรคำนวณใหม่ก่อนใช้ตัดสินใจ",
    );
  return limitations;
}

function recommendedSolarBudget(input: EcosystemPlanInput["solar"]) {
  if (
    input.status !== "ready" ||
    !input.value ||
    input.value.systemType === "not_recommended"
  )
    return null;
  return input.value.initialInvestmentThb;
}

function recommendedBatteryBudget(input: EcosystemPlanInput["battery"]) {
  if (input.status !== "ready" || input.value?.verdict !== "recommend")
    return null;
  return { low: input.value.budgetLowThb, high: input.value.budgetHighThb };
}

function solarBudgetRange(value: EcosystemSolarSummary | null) {
  if (!value || value.systemType === "not_recommended") return null;
  return {
    low: value.initialInvestmentThb * 0.9,
    high: value.initialInvestmentThb * 1.1,
  };
}

function readinessLabel(status: EcosystemReadinessStatus) {
  return status === "stale" ? "ต้องคำนวณใหม่" : "ยังไม่มีผล";
}

function maxNullable(a: number | null, b: number | null) {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function sumNullable(a: number | null, b: number | null) {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(
    value,
  );
}
