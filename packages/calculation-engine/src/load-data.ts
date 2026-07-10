import Decimal from "decimal.js";
import * as XLSX from "xlsx";
import type {
  ApplianceInput,
  LoadIntervalInput,
  LoadProfileColumnMapping,
  MonthlyBillInput
} from "@thai-energy-planner/shared-types";
import {
  ApplianceInputSchema,
  LoadIntervalSchema,
  LoadProfileColumnMappingSchema,
  MonthlyBillInputSchema
} from "@thai-energy-planner/shared-types";
import { selectTouPeriod, type TariffVersionConfig } from "@thai-energy-planner/tariff-engine";

export type ValidationIssue = {
  severity: "error" | "warning";
  code: string;
  messageTh: string;
  rowNumber?: number | undefined;
  field?: string | undefined;
  value?: string | undefined;
};

export type BillValidationResult = {
  bills: MonthlyBillInput[];
  issues: ValidationIssue[];
  canSave: boolean;
};

export type BillSummary = {
  monthCount: number;
  totalKwh: number;
  totalCostThb: number;
  averageCostPerKwh: number | null;
  highestMonth: MonthlyBillInput | null;
  lowestMonth: MonthlyBillInput | null;
  monthlyTrend: Array<{
    month: string;
    energyKwh: number;
    totalCostThb: number;
    averageCostPerKwh: number | null;
  }>;
};

export type ImportOptions = {
  mapping: LoadProfileColumnMapping;
  intervalMinutes?: 15 | 30 | 60;
  timezone?: "Asia/Bangkok";
};

export type LoadProfilePreview = {
  rows: LoadIntervalInput[];
  previewRows: LoadIntervalInput[];
  rowCount: number;
  startTimestamp: string | null;
  endTimestamp: string | null;
  detectedIntervalMinutes: number | null;
  totalKwh: number;
  peakKw: number;
  issues: ValidationIssue[];
  warningCount: number;
  errorCount: number;
  canImport: boolean;
};

export type ApplianceSimulationInput = {
  appliances: ApplianceInput[];
  date: string;
  intervalMinutes?: 15 | 30 | 60;
  holidays?: string[];
};

export type ApplianceSimulationResult = {
  intervals: LoadIntervalInput[];
  kwhPerDay: number;
  estimatedKwhPerMonth: number;
  peakKw: number;
  topAppliance: {
    name: string;
    energyKwh: number;
  } | null;
  applianceShares: Array<{
    name: string;
    energyKwh: number;
    sharePercent: number;
  }>;
};

export type LoadSummaryMetrics = {
  totalKwh: number;
  averageDailyKwh: number;
  averageLoadKw: number;
  peakDemandKw: number;
  loadFactor: number;
  daytimeKwh: number;
  nighttimeKwh: number;
  weekdayKwh: number;
  weekendKwh: number;
  peakPeriodKwh: number;
  offPeakPeriodKwh: number;
  energyByMonth: Array<{ month: string; energyKwh: number }>;
  energyByDayOfWeek: Array<{ dayOfWeek: number; energyKwh: number }>;
  hourlyProfile: Array<{ hour: number; energyKwh: number; averageKw: number }>;
  loadDurationCurve: Array<{ rank: number; powerKw: number }>;
};

export const defaultColumnMapping: LoadProfileColumnMapping = {
  timestamp: "timestamp",
  energyKwh: "energy_kwh",
  powerKw: "power_kw",
  meterId: "meter_id",
  voltage: "voltage",
  powerFactor: "power_factor"
};

export const applianceCatalog = [
  "เครื่องปรับอากาศ",
  "ตู้เย็น",
  "เครื่องทำน้ำอุ่น",
  "ปั๊มน้ำ",
  "โทรทัศน์",
  "เครื่องซักผ้า",
  "เตาไฟฟ้า",
  "คอมพิวเตอร์",
  "ไฟส่องสว่าง",
  "EV Charger",
  "อุปกรณ์กำหนดเอง"
];

export const demoManualBills: MonthlyBillInput[] = [
  {
    authority: "PEA",
    customerSegment: "residential",
    meterMode: "normal",
    month: "2026-01",
    energyKwh: 420,
    totalCostThb: 1810,
    ftThbPerKwh: 0.5,
    serviceChargeThb: 10,
    vatThb: 118
  },
  {
    authority: "PEA",
    customerSegment: "residential",
    meterMode: "normal",
    month: "2026-02",
    energyKwh: 455,
    totalCostThb: 1975,
    ftThbPerKwh: 0.5,
    serviceChargeThb: 10,
    vatThb: 129
  },
  {
    authority: "PEA",
    customerSegment: "residential",
    meterMode: "normal",
    month: "2026-03",
    energyKwh: 510,
    totalCostThb: 2250,
    ftThbPerKwh: 0.5,
    serviceChargeThb: 10,
    vatThb: 147
  },
  {
    authority: "PEA",
    customerSegment: "residential",
    meterMode: "normal",
    month: "2026-04",
    energyKwh: 590,
    totalCostThb: 2630,
    ftThbPerKwh: 0.5,
    serviceChargeThb: 10,
    vatThb: 172
  }
];

export const demoAppliances: ApplianceInput[] = [
  {
    name: "แอร์ห้องนอน",
    category: "เครื่องปรับอากาศ",
    power: 1.2,
    powerUnit: "kW",
    quantity: 1,
    dutyCycle: 0.65,
    schedule: {
      startTime: "22:00",
      endTime: "06:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      workingDayOnly: false,
      holidayOnly: false,
      seasonalMonths: []
    }
  },
  {
    name: "ไฟส่องสว่าง",
    category: "ไฟส่องสว่าง",
    power: 300,
    powerUnit: "W",
    quantity: 1,
    dutyCycle: 1,
    schedule: {
      startTime: "18:00",
      endTime: "23:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      workingDayOnly: false,
      holidayOnly: false,
      seasonalMonths: []
    }
  },
  {
    name: "EV Charger",
    category: "EV Charger",
    power: 7,
    powerUnit: "kW",
    quantity: 1,
    dutyCycle: 1,
    schedule: {
      startTime: "23:00",
      endTime: "02:00",
      daysOfWeek: [1, 3, 5],
      workingDayOnly: false,
      holidayOnly: false,
      seasonalMonths: []
    }
  }
];

export function validateMonthlyBills(bills: MonthlyBillInput[]): BillValidationResult {
  const issues: ValidationIssue[] = [];
  const seenMonths = new Set<string>();
  const validBills: MonthlyBillInput[] = [];

  bills.forEach((bill, index) => {
    const rowNumber = index + 1;
    const parsed = MonthlyBillInputSchema.safeParse(bill);
    if (!parsed.success) {
      issues.push({ severity: "error", code: "invalid_bill", messageTh: "ข้อมูลบิลไม่ถูกต้อง", rowNumber });
      return;
    }

    if (seenMonths.has(parsed.data.month)) {
      issues.push({
        severity: "error",
        code: "duplicate_month",
        messageTh: `เดือน ${parsed.data.month} ซ้ำ`,
        rowNumber,
        field: "month",
        value: parsed.data.month
      });
    }
    seenMonths.add(parsed.data.month);

    const effectiveRate = parsed.data.energyKwh > 0 ? parsed.data.totalCostThb / parsed.data.energyKwh : null;
    if (effectiveRate !== null && effectiveRate < 1) {
      issues.push({
        severity: "warning",
        code: "unusually_low_total_cost",
        messageTh: "ค่าไฟรวมต่ำผิดปกติเมื่อเทียบกับหน่วย kWh",
        rowNumber,
        field: "totalCostThb",
        value: String(parsed.data.totalCostThb)
      });
    }

    validBills.push(parsed.data);
  });

  return {
    bills: validBills,
    issues,
    canSave: !issues.some((issue) => issue.severity === "error")
  };
}

export function summarizeBills(bills: MonthlyBillInput[]): BillSummary {
  const sortedBills = [...bills].sort((a, b) => a.month.localeCompare(b.month));
  const totalKwh = sortedBills.reduce((sum, bill) => sum.plus(bill.energyKwh), new Decimal(0));
  const totalCost = sortedBills.reduce((sum, bill) => sum.plus(bill.totalCostThb), new Decimal(0));
  const highestMonth = sortedBills.reduce<MonthlyBillInput | null>(
    (highest, bill) => (!highest || bill.energyKwh > highest.energyKwh ? bill : highest),
    null
  );
  const lowestMonth = sortedBills.reduce<MonthlyBillInput | null>(
    (lowest, bill) => (!lowest || bill.energyKwh < lowest.energyKwh ? bill : lowest),
    null
  );

  return {
    monthCount: sortedBills.length,
    totalKwh: totalKwh.toNumber(),
    totalCostThb: totalCost.toNumber(),
    averageCostPerKwh: totalKwh.gt(0) ? totalCost.div(totalKwh).toNumber() : null,
    highestMonth,
    lowestMonth,
    monthlyTrend: sortedBills.map((bill) => ({
      month: bill.month,
      energyKwh: bill.energyKwh,
      totalCostThb: bill.totalCostThb,
      averageCostPerKwh: bill.energyKwh > 0 ? bill.totalCostThb / bill.energyKwh : null
    }))
  };
}

export function parseCsvLoadProfile(csvText: string, options: ImportOptions): LoadProfilePreview {
  const rows = parseCsvRows(csvText);
  const [headers = [], ...dataRows] = rows;
  const objects = dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));

  return buildLoadProfilePreview(objects, options);
}

export function parseXlsxLoadProfile(input: ArrayBuffer | Uint8Array, options: ImportOptions): LoadProfilePreview {
  const workbook = XLSX.read(input, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return emptyPreview([{ severity: "error", code: "empty_workbook", messageTh: "ไม่พบ worksheet ในไฟล์ XLSX" }]);
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return emptyPreview([{ severity: "error", code: "missing_sheet", messageTh: "ไม่สามารถอ่าน worksheet แรกได้" }]);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: "" });
  return buildLoadProfilePreview(rows, options);
}

export function buildLoadProfilePreview(rawRows: Array<Record<string, unknown>>, options: ImportOptions): LoadProfilePreview {
  const mappingResult = LoadProfileColumnMappingSchema.safeParse(options.mapping);
  if (!mappingResult.success) {
    return emptyPreview([{ severity: "error", code: "invalid_column_mapping", messageTh: "Column mapping ไม่ถูกต้อง" }]);
  }

  const mappedRows: LoadIntervalInput[] = [];
  const issues: ValidationIssue[] = [];
  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const mapped = mapRowToInterval(row, mappingResult.data, rowNumber, issues);
    if (mapped) mappedRows.push(mapped);
  });

  const normalizedRows = normalizeIntervals(mappedRows, options.intervalMinutes, issues);
  const sortedRows = [...normalizedRows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const detectedIntervalMinutes = detectIntervalMinutes(sortedRows);
  appendIntervalIssues(sortedRows, detectedIntervalMinutes, issues);

  const totalKwh = sortedRows.reduce((sum, row) => sum.plus(row.energyKwh), new Decimal(0));
  const peakKw = sortedRows.reduce((peak, row) => Decimal.max(peak, row.powerKw ?? 0), new Decimal(0));
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    rows: sortedRows,
    previewRows: sortedRows.slice(0, 20),
    rowCount: sortedRows.length,
    startTimestamp: sortedRows[0]?.timestamp ?? null,
    endTimestamp: sortedRows.at(-1)?.timestamp ?? null,
    detectedIntervalMinutes,
    totalKwh: totalKwh.toNumber(),
    peakKw: peakKw.toNumber(),
    issues,
    warningCount,
    errorCount,
    canImport: errorCount === 0
  };
}

export function detectIntervalMinutes(intervals: LoadIntervalInput[]): number | null {
  if (intervals.length < 2) return null;

  const sorted = [...intervals].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const minutes = sorted.slice(1).map((row, index) => {
    const previous = sorted[index];
    if (!previous) return 0;
    return (new Date(row.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 60000;
  });
  const positive = minutes.filter((value) => value > 0);

  return positive.length === 0 ? null : mode(positive);
}

export function simulateApplianceLoadProfile(input: ApplianceSimulationInput): ApplianceSimulationResult {
  const intervalMinutes = input.intervalMinutes ?? 15;
  const holidays = new Set(input.holidays ?? []);
  const intervalHours = intervalMinutes / 60;
  const intervalsByTimestamp = new Map<string, Decimal>();
  const applianceEnergy = new Map<string, Decimal>();

  for (let minute = 0; minute < 24 * 60; minute += intervalMinutes) {
    intervalsByTimestamp.set(localDateMinuteToBangkokIso(input.date, minute), new Decimal(0));
  }

  for (const applianceInput of input.appliances) {
    const parsed = ApplianceInputSchema.parse(applianceInput);
    const powerKw = parsed.powerUnit === "W" ? new Decimal(parsed.power).div(1000) : new Decimal(parsed.power);
    const intervalEnergy = powerKw.mul(parsed.quantity).mul(parsed.dutyCycle).mul(intervalHours);
    let totalApplianceEnergy = new Decimal(0);

    for (let minute = 0; minute < 24 * 60; minute += intervalMinutes) {
      if (!isApplianceActive(parsed, input.date, minute, holidays)) continue;

      const timestamp = localDateMinuteToBangkokIso(input.date, minute);
      intervalsByTimestamp.set(timestamp, (intervalsByTimestamp.get(timestamp) ?? new Decimal(0)).plus(intervalEnergy));
      totalApplianceEnergy = totalApplianceEnergy.plus(intervalEnergy);
    }

    applianceEnergy.set(parsed.name, (applianceEnergy.get(parsed.name) ?? new Decimal(0)).plus(totalApplianceEnergy));
  }

  const intervals = [...intervalsByTimestamp.entries()].map(([timestamp, energy]) => {
    const powerKw = energy.div(intervalHours);
    return {
      timestamp,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      powerKw: powerKw.toDecimalPlaces(6).toNumber()
    };
  });
  const kwhPerDay = intervals.reduce((sum, row) => sum.plus(row.energyKwh), new Decimal(0));
  const peakKw = intervals.reduce((peak, row) => Decimal.max(peak, row.powerKw ?? 0), new Decimal(0));
  const applianceShares = [...applianceEnergy.entries()]
    .map(([name, energy]) => ({
      name,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      sharePercent: kwhPerDay.gt(0) ? energy.div(kwhPerDay).mul(100).toDecimalPlaces(2).toNumber() : 0
    }))
    .sort((a, b) => b.energyKwh - a.energyKwh);

  return {
    intervals,
    kwhPerDay: kwhPerDay.toDecimalPlaces(6).toNumber(),
    estimatedKwhPerMonth: kwhPerDay.mul(30).toDecimalPlaces(2).toNumber(),
    peakKw: peakKw.toDecimalPlaces(6).toNumber(),
    topAppliance: applianceShares[0] ? { name: applianceShares[0].name, energyKwh: applianceShares[0].energyKwh } : null,
    applianceShares
  };
}

export function summarizeLoadProfile(
  intervals: LoadIntervalInput[],
  options: { tariffVersion?: TariffVersionConfig } = {}
): LoadSummaryMetrics {
  const validIntervals = intervals
    .map((row) => LoadIntervalSchema.parse(row))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const detectedIntervalMinutes = detectIntervalMinutes(validIntervals) ?? 60;
  const intervalHours = detectedIntervalMinutes / 60;
  const totalKwh = validIntervals.reduce((sum, row) => sum.plus(row.energyKwh), new Decimal(0));
  const peakDemandKw = validIntervals.reduce((peak, row) => Decimal.max(peak, row.powerKw ?? row.energyKwh / intervalHours), new Decimal(0));
  const uniqueDates = new Set(validIntervals.map((row) => getBangkokParts(row.timestamp).date));
  const averageDailyKwh = uniqueDates.size > 0 ? totalKwh.div(uniqueDates.size) : new Decimal(0);
  const averageLoadKw = validIntervals.length > 0 ? totalKwh.div(validIntervals.length * intervalHours) : new Decimal(0);
  const loadFactor = peakDemandKw.gt(0) ? averageLoadKw.div(peakDemandKw) : new Decimal(0);

  let daytimeKwh = new Decimal(0);
  let nighttimeKwh = new Decimal(0);
  let weekdayKwh = new Decimal(0);
  let weekendKwh = new Decimal(0);
  let peakPeriodKwh = new Decimal(0);
  let offPeakPeriodKwh = new Decimal(0);
  const monthMap = new Map<string, Decimal>();
  const dayOfWeekMap = new Map<number, Decimal>();
  const hourMap = new Map<number, Decimal>();

  for (const interval of validIntervals) {
    const local = getBangkokParts(interval.timestamp);
    const energy = new Decimal(interval.energyKwh);
    if (local.hour >= 6 && local.hour < 18) daytimeKwh = daytimeKwh.plus(energy);
    else nighttimeKwh = nighttimeKwh.plus(energy);

    if (local.dayOfWeek === 0 || local.dayOfWeek === 6) weekendKwh = weekendKwh.plus(energy);
    else weekdayKwh = weekdayKwh.plus(energy);

    const month = local.date.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? new Decimal(0)).plus(energy));
    dayOfWeekMap.set(local.dayOfWeek, (dayOfWeekMap.get(local.dayOfWeek) ?? new Decimal(0)).plus(energy));
    hourMap.set(local.hour, (hourMap.get(local.hour) ?? new Decimal(0)).plus(energy));

    if (options.tariffVersion?.meterMode === "tou") {
      const isHoliday = options.tariffVersion.holidays.some((holiday) => getDateKey(holiday.date) === local.date);
      const period = selectTouPeriod(options.tariffVersion.touPeriods, interval.timestamp, isHoliday);
      if (period.periodType === "peak") peakPeriodKwh = peakPeriodKwh.plus(energy);
      else offPeakPeriodKwh = offPeakPeriodKwh.plus(energy);
    }
  }

  const loadDurationCurve = validIntervals
    .map((row) => row.powerKw ?? row.energyKwh / intervalHours)
    .sort((a, b) => b - a)
    .map((powerKw, index) => ({ rank: index + 1, powerKw }));

  return {
    totalKwh: totalKwh.toDecimalPlaces(6).toNumber(),
    averageDailyKwh: averageDailyKwh.toDecimalPlaces(6).toNumber(),
    averageLoadKw: averageLoadKw.toDecimalPlaces(6).toNumber(),
    peakDemandKw: peakDemandKw.toDecimalPlaces(6).toNumber(),
    loadFactor: loadFactor.toDecimalPlaces(6).toNumber(),
    daytimeKwh: daytimeKwh.toDecimalPlaces(6).toNumber(),
    nighttimeKwh: nighttimeKwh.toDecimalPlaces(6).toNumber(),
    weekdayKwh: weekdayKwh.toDecimalPlaces(6).toNumber(),
    weekendKwh: weekendKwh.toDecimalPlaces(6).toNumber(),
    peakPeriodKwh: peakPeriodKwh.toDecimalPlaces(6).toNumber(),
    offPeakPeriodKwh: offPeakPeriodKwh.toDecimalPlaces(6).toNumber(),
    energyByMonth: [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, energy]) => ({ month, energyKwh: energy.toNumber() })),
    energyByDayOfWeek: [...dayOfWeekMap.entries()].sort(([a], [b]) => a - b).map(([dayOfWeek, energy]) => ({ dayOfWeek, energyKwh: energy.toNumber() })),
    hourlyProfile: [...hourMap.entries()].sort(([a], [b]) => a - b).map(([hour, energy]) => ({
      hour,
      energyKwh: energy.toNumber(),
      averageKw: energy.div(intervalHours).toDecimalPlaces(6).toNumber()
    })),
    loadDurationCurve
  };
}

function mapRowToInterval(
  row: Record<string, unknown>,
  mapping: LoadProfileColumnMapping,
  rowNumber: number,
  issues: ValidationIssue[]
): LoadIntervalInput | null {
  const timestampValue = readCell(row, mapping.timestamp);
  const timestamp = parseTimestampToBangkokIso(timestampValue);
  if (!timestamp) {
    issues.push({
      severity: "error",
      code: "invalid_timestamp",
      messageTh: "timestamp ไม่ถูกต้องหรือไม่มี timezone ที่แปลงได้",
      rowNumber,
      field: mapping.timestamp,
      value: timestampValue
    });
    return null;
  }

  const energyValue = mapping.energyKwh ? readCell(row, mapping.energyKwh) : "";
  const powerValue = mapping.powerKw ? readCell(row, mapping.powerKw) : "";
  const energy = energyValue === "" ? null : toNumber(energyValue);
  const power = powerValue === "" ? null : toNumber(powerValue);

  if (energy === null && power === null) {
    issues.push({ severity: "error", code: "missing_energy_or_power", messageTh: "ต้องมี energy_kwh หรือ power_kw อย่างน้อยหนึ่งค่า", rowNumber });
    return null;
  }

  if (energy !== null && energy < 0) {
    issues.push({ severity: "error", code: "negative_energy_kwh", messageTh: "energy_kwh ห้ามติดลบ", rowNumber, field: mapping.energyKwh, value: energyValue });
  }

  if (power !== null && power < 0) {
    issues.push({ severity: "error", code: "negative_power_kw", messageTh: "power_kw ห้ามติดลบ", rowNumber, field: mapping.powerKw, value: powerValue });
  }

  return {
    timestamp,
    energyKwh: energy ?? 0,
    powerKw: power ?? undefined,
    meterId: mapping.meterId ? readCell(row, mapping.meterId) || undefined : undefined,
    voltage: mapping.voltage ? toOptionalNumber(readCell(row, mapping.voltage)) : undefined,
    powerFactor: mapping.powerFactor ? toOptionalNumber(readCell(row, mapping.powerFactor)) : undefined
  };
}

function normalizeIntervals(
  rows: LoadIntervalInput[],
  configuredIntervalMinutes: 15 | 30 | 60 | undefined,
  issues: ValidationIssue[]
): LoadIntervalInput[] {
  const sorted = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const intervalMinutes = configuredIntervalMinutes ?? detectIntervalMinutes(sorted) ?? 60;
  const intervalHours = intervalMinutes / 60;

  return sorted.map((row) => {
    const energyKwh = row.energyKwh || ((row.powerKw ?? 0) * intervalHours);
    const powerKw = row.powerKw ?? energyKwh / intervalHours;
    const parsed = LoadIntervalSchema.safeParse({ ...row, energyKwh, powerKw });
    if (!parsed.success) {
      issues.push({ severity: "error", code: "invalid_interval", messageTh: "ข้อมูล interval ไม่ผ่าน validation" });
      return row;
    }

    return parsed.data;
  });
}

function appendIntervalIssues(rows: LoadIntervalInput[], detectedIntervalMinutes: number | null, issues: ValidationIssue[]) {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (seen.has(row.timestamp)) {
      issues.push({
        severity: "error",
        code: "duplicate_timestamp",
        messageTh: "timestamp ซ้ำ",
        rowNumber: index + 2,
        field: "timestamp",
        value: formatBangkokMinute(row.timestamp)
      });
    }
    seen.add(row.timestamp);
  });

  if (!detectedIntervalMinutes || rows.length < 2) return;

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    if (!previous || !current) continue;
    const diffMinutes = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 60000;
    if (diffMinutes <= 0) {
      issues.push({ severity: "error", code: "timestamp_not_ascending", messageTh: "timestamp ไม่เรียงตามเวลา", rowNumber: index + 2 });
    } else if (diffMinutes !== detectedIntervalMinutes) {
      if (diffMinutes > detectedIntervalMinutes) {
        for (const missingTimestamp of listMissingBangkokMinutes(previous.timestamp, current.timestamp, detectedIntervalMinutes)) {
          issues.push({
            severity: "warning",
            code: "missing_timestamp",
            messageTh: "timestamp ขาดหาย",
            rowNumber: index + 2,
            field: "timestamp",
            value: missingTimestamp
          });
        }
      }

      issues.push({
        severity: "warning",
        code: "irregular_interval",
        messageTh: "interval ไม่ต่อเนื่องหรือไม่สม่ำเสมอ",
        rowNumber: index + 2,
        field: "timestamp",
        value: `${formatBangkokMinute(previous.timestamp)} -> ${formatBangkokMinute(current.timestamp)} (${diffMinutes} min)`
      });
    }
  }
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  return rows;
}

function parseTimestampToBangkokIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (ymd) return localPartsToUtcIso(ymd[1], ymd[2], ymd[3], ymd[4], ymd[5], ymd[6] ?? "00");

  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (dmy) return localPartsToUtcIso(dmy[3], dmy[2], dmy[1], dmy[4], dmy[5], dmy[6] ?? "00");

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function localPartsToUtcIso(
  year: string | undefined,
  month: string | undefined,
  day: string | undefined,
  hour: string | undefined,
  minute: string | undefined,
  second: string | undefined
): string | null {
  if (!year || !month || !day || !hour || !minute || !second) return null;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 7, Number(minute), Number(second))).toISOString();
}

function getBangkokParts(timestamp: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short"
    })
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value])
  );
  const dayOfWeek = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday ?? ""] ?? 0;
  const hour = Number(parts.hour ?? 0);
  const minute = Number(parts.minute ?? 0);

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute,
    dayOfWeek,
    minuteOfDay: hour * 60 + minute
  };
}

function formatBangkokMinute(timestamp: string): string {
  const local = getBangkokParts(timestamp);
  return `${local.date} ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
}

function listMissingBangkokMinutes(previousTimestamp: string, currentTimestamp: string, intervalMinutes: number): string[] {
  const missing: string[] = [];
  const currentMs = new Date(currentTimestamp).getTime();
  const stepMs = intervalMinutes * 60000;

  for (let missingMs = new Date(previousTimestamp).getTime() + stepMs; missingMs < currentMs; missingMs += stepMs) {
    missing.push(formatBangkokMinute(new Date(missingMs).toISOString()));
  }

  return missing;
}

function getDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getBangkokParts(value).date;
}

function localDateMinuteToBangkokIso(date: string, minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return parseTimestampToBangkokIso(`${date} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`) ?? "";
}

function isApplianceActive(
  appliance: ApplianceInput,
  date: string,
  minuteOfDay: number,
  holidays: ReadonlySet<string>,
): boolean {
  const start = timeToMinute(appliance.schedule.startTime);
  const end = timeToMinute(appliance.schedule.endTime);
  const crossesMidnight = start > end;
  const scheduleDate = crossesMidnight && minuteOfDay < end ? previousDate(date) : date;
  const local = getBangkokParts(localDateMinuteToBangkokIso(scheduleDate, 0));
  const isHoliday = holidays.has(scheduleDate);
  const isWorkingDay = local.dayOfWeek >= 1 && local.dayOfWeek <= 5 && !isHoliday;

  if (!appliance.schedule.daysOfWeek.includes(local.dayOfWeek)) return false;
  if (appliance.schedule.workingDayOnly && !isWorkingDay) return false;
  if (appliance.schedule.holidayOnly && !isHoliday) return false;

  if (appliance.schedule.seasonalMonths.length > 0) {
    const month = Number(scheduleDate.slice(5, 7));
    if (!appliance.schedule.seasonalMonths.includes(month)) return false;
  }

  if (start === end) return true;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;

  return minuteOfDay >= start || minuteOfDay < end;
}

function previousDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function timeToMinute(time: string): number {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

function readCell(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value).trim();
}

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalNumber(value: string): number | undefined {
  return toNumber(value) ?? undefined;
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? values[0] ?? 0;
}

function emptyPreview(issues: ValidationIssue[]): LoadProfilePreview {
  return {
    rows: [],
    previewRows: [],
    rowCount: 0,
    startTimestamp: null,
    endTimestamp: null,
    detectedIntervalMinutes: null,
    totalKwh: 0,
    peakKw: 0,
    issues,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
    errorCount: issues.filter((issue) => issue.severity === "error").length,
    canImport: !issues.some((issue) => issue.severity === "error")
  };
}
