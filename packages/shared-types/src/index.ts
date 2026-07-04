import { z } from "zod";

export const AuthoritySchema = z.enum(["PEA", "MEA"]);
export type Authority = z.infer<typeof AuthoritySchema>;

export const CustomerSegmentSchema = z.enum([
  "residential",
  "small_business",
  "medium_business",
  "large_business"
]);
export type CustomerSegment = z.infer<typeof CustomerSegmentSchema>;

export const MeterModeSchema = z.enum(["normal", "tou"]);
export type MeterMode = z.infer<typeof MeterModeSchema>;

export const TariffStatusSchema = z.enum(["draft", "verified", "published", "retired"]);
export type TariffStatus = z.infer<typeof TariffStatusSchema>;

export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const MonthlyBillInputSchema = z.object({
  month: MonthSchema,
  energyKwh: z.number().nonnegative(),
  totalCostThb: z.number().nonnegative(),
  ftThbPerKwh: z.number().optional(),
  serviceChargeThb: z.number().nonnegative().optional(),
  vatThb: z.number().nonnegative().optional(),
  authority: AuthoritySchema.optional(),
  customerSegment: CustomerSegmentSchema.optional(),
  meterMode: MeterModeSchema.optional(),
  meterSize: z.string().optional(),
  voltage: z.string().optional(),
  notes: z.string().optional()
});
export type MonthlyBillInput = z.infer<typeof MonthlyBillInputSchema>;

export const LoadIntervalSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  energyKwh: z.number().nonnegative(),
  powerKw: z.number().nonnegative().optional(),
  meterId: z.string().optional(),
  voltage: z.number().positive().optional(),
  powerFactor: z.number().min(0).max(1).optional()
});
export type LoadIntervalInput = z.infer<typeof LoadIntervalSchema>;

export const LoadProfileColumnMappingSchema = z.object({
  timestamp: z.string().min(1),
  energyKwh: z.string().min(1).optional(),
  powerKw: z.string().min(1).optional(),
  meterId: z.string().min(1).optional(),
  voltage: z.string().min(1).optional(),
  powerFactor: z.string().min(1).optional()
}).refine((value) => Boolean(value.energyKwh || value.powerKw), {
  message: "ต้องเลือกอย่างน้อย energy_kwh หรือ power_kw"
});
export type LoadProfileColumnMapping = z.infer<typeof LoadProfileColumnMappingSchema>;

export const UploadedFileMetadataSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(["csv", "xlsx"]),
  fileSizeBytes: z.number().int().nonnegative(),
  intervalMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  timezone: z.literal("Asia/Bangkok").default("Asia/Bangkok")
});
export type UploadedFileMetadata = z.infer<typeof UploadedFileMetadataSchema>;

export const ApplianceScheduleInputSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  workingDayOnly: z.boolean().default(false),
  holidayOnly: z.boolean().default(false),
  seasonalMonths: z.array(z.number().int().min(1).max(12)).default([])
});
export type ApplianceScheduleInput = z.infer<typeof ApplianceScheduleInputSchema>;

export const ApplianceInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  power: z.number().positive(),
  powerUnit: z.enum(["W", "kW"]),
  quantity: z.number().int().positive(),
  dutyCycle: z.number().min(0).max(1),
  schedule: ApplianceScheduleInputSchema,
  notes: z.string().optional()
});
export type ApplianceInput = z.infer<typeof ApplianceInputSchema>;

export const AnalysisModeSchema = z.enum([
  "baseline_normal",
  "tou_no_shift",
  "tou_load_shift",
  "normal_solar",
  "tou_solar",
  "solar_battery",
  "tou_solar_battery",
  "ev_current_charging",
  "ev_off_peak_charging"
]);
export type AnalysisMode = z.infer<typeof AnalysisModeSchema>;

export const TariffSeedMetadataSchema = z.object({
  status: TariffStatusSchema,
  authority: AuthoritySchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  sourceUrl: z.string().url().nullable(),
  verifiedAt: z.string().datetime({ offset: true }).nullable(),
  verifiedBy: z.string().nullable(),
  notes: z.string()
});
export type TariffSeedMetadata = z.infer<typeof TariffSeedMetadataSchema>;

export const PhaseSchema = z.enum([
  "foundation",
  "tariff_engine",
  "load_data",
  "scenario_engine",
  "solar_finance",
  "ev_battery",
  "report_admin",
  "qa_deployment"
]);
export type Phase = z.infer<typeof PhaseSchema>;
