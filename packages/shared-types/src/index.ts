import { z } from "zod";

export * from "./load-profile.js";

export const AuthoritySchema = z.enum(["PEA", "MEA"]);
export type Authority = z.infer<typeof AuthoritySchema>;

export const CustomerSegmentSchema = z.enum([
  "residential",
  "small_business",
  "medium_business",
  "large_business",
]);
export type CustomerSegment = z.infer<typeof CustomerSegmentSchema>;

export const CustomerSegmentDbSchema = z.enum([
  "RESIDENTIAL",
  "SMALL_BUSINESS",
  "MEDIUM_BUSINESS",
  "LARGE_BUSINESS",
]);
export type CustomerSegmentDb = z.infer<typeof CustomerSegmentDbSchema>;

export const MeterModeSchema = z.enum(["normal", "tou"]);
export type MeterMode = z.infer<typeof MeterModeSchema>;

export const MeterModeDbSchema = z.enum(["NORMAL", "TOU"]);
export type MeterModeDb = z.infer<typeof MeterModeDbSchema>;

export const TariffStatusSchema = z.enum([
  "draft",
  "verified",
  "published",
  "retired",
]);
export type TariffStatus = z.infer<typeof TariffStatusSchema>;

export const TariffStatusDbSchema = z.enum([
  "DRAFT",
  "VERIFIED",
  "PUBLISHED",
  "RETIRED",
]);
export type TariffStatusDb = z.infer<typeof TariffStatusDbSchema>;

export const customerSegmentToDb = {
  residential: "RESIDENTIAL",
  small_business: "SMALL_BUSINESS",
  medium_business: "MEDIUM_BUSINESS",
  large_business: "LARGE_BUSINESS",
} as const satisfies Record<CustomerSegment, CustomerSegmentDb>;

export const customerSegmentFromDb = {
  RESIDENTIAL: "residential",
  SMALL_BUSINESS: "small_business",
  MEDIUM_BUSINESS: "medium_business",
  LARGE_BUSINESS: "large_business",
} as const satisfies Record<CustomerSegmentDb, CustomerSegment>;

export const meterModeToDb = {
  normal: "NORMAL",
  tou: "TOU",
} as const satisfies Record<MeterMode, MeterModeDb>;

export const meterModeFromDb = {
  NORMAL: "normal",
  TOU: "tou",
} as const satisfies Record<MeterModeDb, MeterMode>;

export const tariffStatusToDb = {
  draft: "DRAFT",
  verified: "VERIFIED",
  published: "PUBLISHED",
  retired: "RETIRED",
} as const satisfies Record<TariffStatus, TariffStatusDb>;

export const tariffStatusFromDb = {
  DRAFT: "draft",
  VERIFIED: "verified",
  PUBLISHED: "published",
  RETIRED: "retired",
} as const satisfies Record<TariffStatusDb, TariffStatus>;

export function toDbCustomerSegment(value: CustomerSegment): CustomerSegmentDb {
  return customerSegmentToDb[value];
}

export function fromDbCustomerSegment(
  value: CustomerSegmentDb,
): CustomerSegment {
  return customerSegmentFromDb[value];
}

export function toDbMeterMode(value: MeterMode): MeterModeDb {
  return meterModeToDb[value];
}

export function fromDbMeterMode(value: MeterModeDb): MeterMode {
  return meterModeFromDb[value];
}

export function toDbTariffStatus(value: TariffStatus): TariffStatusDb {
  return tariffStatusToDb[value];
}

export function fromDbTariffStatus(value: TariffStatusDb): TariffStatus {
  return tariffStatusFromDb[value];
}

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
  notes: z.string().optional(),
});
export type MonthlyBillInput = z.infer<typeof MonthlyBillInputSchema>;

export const LoadIntervalSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  energyKwh: z.number().nonnegative(),
  powerKw: z.number().nonnegative().optional(),
  meterId: z.string().optional(),
  voltage: z.number().positive().optional(),
  powerFactor: z.number().min(0).max(1).optional(),
});
export type LoadIntervalInput = z.infer<typeof LoadIntervalSchema>;

export const LoadProfileColumnMappingSchema = z
  .object({
    timestamp: z.string().min(1),
    energyKwh: z.string().min(1).optional(),
    powerKw: z.string().min(1).optional(),
    meterId: z.string().min(1).optional(),
    voltage: z.string().min(1).optional(),
    powerFactor: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.energyKwh || value.powerKw), {
    message: "ต้องเลือกอย่างน้อย energy_kwh หรือ power_kw",
  });
export type LoadProfileColumnMapping = z.infer<
  typeof LoadProfileColumnMappingSchema
>;

export const UploadedFileMetadataSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(["csv", "xlsx"]),
  fileSizeBytes: z.number().int().nonnegative(),
  intervalMinutes: z
    .union([z.literal(15), z.literal(30), z.literal(60)])
    .optional(),
  timezone: z.literal("Asia/Bangkok").default("Asia/Bangkok"),
});
export type UploadedFileMetadata = z.infer<typeof UploadedFileMetadataSchema>;

export const ApplianceScheduleInputSchema = z
  .object({
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
    workingDayOnly: z.boolean().default(false),
    holidayOnly: z.boolean().default(false),
    seasonalMonths: z.array(z.number().int().min(1).max(12)).default([]),
  })
  .refine((schedule) => !(schedule.workingDayOnly && schedule.holidayOnly), {
    message: "workingDayOnly and holidayOnly cannot both be true",
    path: ["holidayOnly"],
  });
export type ApplianceScheduleInput = z.infer<
  typeof ApplianceScheduleInputSchema
>;

export const ApplianceInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  power: z.number().positive(),
  powerUnit: z.enum(["W", "kW"]),
  quantity: z.number().int().positive(),
  dutyCycle: z.number().min(0).max(1),
  schedule: ApplianceScheduleInputSchema,
  notes: z.string().optional(),
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
  "ev_off_peak_charging",
]);
export type AnalysisMode = z.infer<typeof AnalysisModeSchema>;

export const ScenarioKindSchema = z.enum([
  "CURRENT_NORMAL",
  "CURRENT_TOU",
  "SWITCH_TO_TOU_NO_BEHAVIOR_CHANGE",
  "LOAD_SHIFT_TO_OFF_PEAK",
  "CUSTOM_LOAD_SHIFT",
  "BASELINE_NORMAL",
  "TOU_NO_SHIFT",
  "TOU_LOAD_SHIFT",
  "NORMAL_SOLAR",
  "TOU_SOLAR",
  "SOLAR_BATTERY",
  "TOU_SOLAR_BATTERY",
  "EV_CURRENT_CHARGING",
  "EV_OFF_PEAK_CHARGING",
]);
export type ScenarioKind = z.infer<typeof ScenarioKindSchema>;

export const analysisModeToScenarioKind = {
  baseline_normal: "BASELINE_NORMAL",
  tou_no_shift: "TOU_NO_SHIFT",
  tou_load_shift: "TOU_LOAD_SHIFT",
  normal_solar: "NORMAL_SOLAR",
  tou_solar: "TOU_SOLAR",
  solar_battery: "SOLAR_BATTERY",
  tou_solar_battery: "TOU_SOLAR_BATTERY",
  ev_current_charging: "EV_CURRENT_CHARGING",
  ev_off_peak_charging: "EV_OFF_PEAK_CHARGING",
} as const satisfies Record<AnalysisMode, ScenarioKind>;

export const analysisModeFromScenarioKind = {
  BASELINE_NORMAL: "baseline_normal",
  TOU_NO_SHIFT: "tou_no_shift",
  TOU_LOAD_SHIFT: "tou_load_shift",
  NORMAL_SOLAR: "normal_solar",
  TOU_SOLAR: "tou_solar",
  SOLAR_BATTERY: "solar_battery",
  TOU_SOLAR_BATTERY: "tou_solar_battery",
  EV_CURRENT_CHARGING: "ev_current_charging",
  EV_OFF_PEAK_CHARGING: "ev_off_peak_charging",
} as const satisfies Partial<Record<ScenarioKind, AnalysisMode>>;

export function toDbScenarioKind(value: AnalysisMode): ScenarioKind {
  return analysisModeToScenarioKind[value];
}

export function fromDbScenarioKind(value: ScenarioKind): AnalysisMode | null {
  if (value in analysisModeFromScenarioKind) {
    return analysisModeFromScenarioKind[
      value as keyof typeof analysisModeFromScenarioKind
    ];
  }
  return null;
}

export const TariffSeedMetadataSchema = z.object({
  status: TariffStatusSchema,
  authority: AuthoritySchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  sourceUrl: z.string().url().nullable(),
  verifiedAt: z.string().datetime({ offset: true }).nullable(),
  verifiedBy: z.string().nullable(),
  notes: z.string(),
});
export type TariffSeedMetadata = z.infer<typeof TariffSeedMetadataSchema>;

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

export const TariffPlanIdentitySchema = z.object({
  authority: AuthoritySchema,
  customerSegment: CustomerSegmentSchema,
  meterMode: MeterModeSchema,
  voltageLevel: z.string().nullable().optional(),
  name: z.string().min(1),
});
export type TariffPlanIdentity = z.infer<typeof TariffPlanIdentitySchema>;

export const TariffSnapshotPayloadSchema = z
  .object({
    tariffVersionId: z.string().min(1).optional(),
    engineVersion: z.string().min(1).optional(),
    capturedAt: z.string().datetime({ offset: true }).optional(),
    status: TariffStatusSchema.optional(),
    authority: AuthoritySchema.optional(),
    effectiveFrom: z.string().date().optional(),
    effectiveTo: z.string().date().nullable().optional(),
    payload: JsonValueSchema.optional(),
  })
  .passthrough();
export type TariffSnapshotPayload = z.infer<typeof TariffSnapshotPayloadSchema>;

export const ScenarioInputSnapshotPayloadSchema = z.object({
  kind: ScenarioKindSchema,
  loadProfileSnapshot: JsonValueSchema,
  tariffSnapshot: TariffSnapshotPayloadSchema.or(JsonValueSchema),
  assumptions: JsonValueSchema,
  validationSummary: JsonValueSchema.optional(),
});
export type ScenarioInputSnapshotPayload = z.infer<
  typeof ScenarioInputSnapshotPayloadSchema
>;

export const ScenarioResultEnvelopeSchema = z.object({
  resultType: z.string().min(1).default("generic"),
  schemaVersion: z.string().min(1).default("1"),
  engineVersion: z.string().min(1).optional(),
  rawResult: JsonValueSchema,
  calculationTrace: JsonValueSchema.optional(),
});
export type ScenarioResultEnvelope = z.infer<
  typeof ScenarioResultEnvelopeSchema
>;

export const PhaseSchema = z.enum([
  "foundation",
  "tariff_engine",
  "load_data",
  "scenario_engine",
  "solar_finance",
  "ev_battery",
  "report_admin",
  "qa_deployment",
]);
export type Phase = z.infer<typeof PhaseSchema>;
