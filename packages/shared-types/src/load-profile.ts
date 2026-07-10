import { z } from "zod";

export const CanonicalLoadProfileSchemaVersionSchema = z.literal("1");
export type CanonicalLoadProfileSchemaVersion = z.infer<
  typeof CanonicalLoadProfileSchemaVersionSchema
>;

export const LoadProfileSourceKindSchema = z.enum([
  "smart_meter",
  "csv",
  "xlsx",
  "appliance",
  "bill_estimate",
  "demo",
]);
export type LoadProfileSourceKind = z.infer<typeof LoadProfileSourceKindSchema>;

export const LoadProfileIntervalMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);
export type LoadProfileIntervalMinutes = z.infer<
  typeof LoadProfileIntervalMinutesSchema
>;

export const LoadProfileQualityLevelSchema = z.enum([
  "measured",
  "modeled",
  "estimated",
]);
export type LoadProfileQualityLevel = z.infer<
  typeof LoadProfileQualityLevelSchema
>;

export const CanonicalLoadProfileIntervalSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  energyKwh: z.number().nonnegative(),
  averagePowerKw: z.number().nonnegative(),
  measuredDemandKw: z.number().nonnegative().optional(),
  qualityFlags: z.array(z.string().min(1)).default([]),
});
export type CanonicalLoadProfileInterval = z.infer<
  typeof CanonicalLoadProfileIntervalSchema
>;

export const CanonicalLoadProfileSchema = z
  .object({
    schemaVersion: CanonicalLoadProfileSchemaVersionSchema,
    id: z.string().min(1),
    name: z.string().min(1),
    source: z.object({
      kind: LoadProfileSourceKindSchema,
      reference: z.string().min(1).optional(),
      generatedAt: z.string().datetime({ offset: true }),
    }),
    timezone: z.literal("Asia/Bangkok"),
    intervalMinutes: LoadProfileIntervalMinutesSchema,
    period: z.object({
      startInclusive: z.string().datetime({ offset: true }),
      endExclusive: z.string().datetime({ offset: true }),
    }),
    intervals: z.array(CanonicalLoadProfileIntervalSchema).min(1),
    quality: z.object({
      level: LoadProfileQualityLevelSchema,
      completeness: z.number().min(0).max(1),
      missingIntervalCount: z.number().int().nonnegative(),
      duplicateIntervalCount: z.number().int().nonnegative(),
      warnings: z.array(z.string().min(1)),
    }),
    assumptions: z.record(z.unknown()),
    calculationVersion: z.string().min(1),
  })
  .superRefine((profile, context) => {
    if (
      new Date(profile.period.endExclusive).getTime() <=
      new Date(profile.period.startInclusive).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period", "endExclusive"],
        message: "endExclusive must be after startInclusive",
      });
    }

    const timestamps = new Set<string>();
    let previousTimestamp = -Infinity;
    for (const [index, interval] of profile.intervals.entries()) {
      const timestamp = new Date(interval.timestamp).getTime();
      if (timestamp <= previousTimestamp) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["intervals", index, "timestamp"],
          message: "interval timestamps must be strictly increasing",
        });
      }
      if (timestamps.has(interval.timestamp)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["intervals", index, "timestamp"],
          message: "interval timestamps must be unique",
        });
      }
      timestamps.add(interval.timestamp);
      previousTimestamp = timestamp;
    }
  });
export type CanonicalLoadProfile = z.infer<typeof CanonicalLoadProfileSchema>;
