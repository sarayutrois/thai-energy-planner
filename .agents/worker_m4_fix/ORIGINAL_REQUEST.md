## 2026-07-07T21:06:36Z

You are a Specialist Worker tasked with fixing 5 specific bugs in the codebase related to the Yearly Load Profiles upgrade.

## Metadata & Workspace
Working Directory: c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\worker_m4_fix\
Please initialize BRIEFING.md and progress.md in your working directory.

## Tasks:

1. **Fix Engine Bug 1 (Unscaled Peak Power)**: 
   In `packages/calculation-engine/src/solar-engine.ts`, update `scaleLoadIntervals` and `scaleGridImportIntervals` to scale power fields by the multiplier factor.
   - For `scaleLoadIntervals`: if `interval.powerKw` is defined, scale it by `factor` and round to 6 decimal places (e.g. `new Decimal(interval.powerKw).mul(factor).toDecimalPlaces(6).toNumber()`).
   - For `scaleGridImportIntervals`: scale `interval.gridImportPowerKw` by `factor` and round to 6 decimal places.

2. **Fix API Zod Validation**:
   In `apps/web/src/lib/calculation-api.ts`, search for regex `/^\d{4}-\d{2}$/` and change it to `/^\d{4}-(0[1-9]|1[0-2])$/` in both `estimateRequestSchema` and `solarAnalyzeRequestSchema` to reject invalid months like `YYYY-00` and `YYYY-13`.

3. **Fix Sub-Year Annualization Bug**:
   In `packages/calculation-engine/src/solar-engine.ts`:
   - Calculate `annualizationFactor`: If `isRepresentative` is false and `simulatedMonths.length < 12`, set `annualizationFactor` to `new Decimal(12).div(simulatedMonths.length)`. Otherwise, set it to `new Decimal(1)`.
   - Update `buildBillScenario` to take `annualizationFactor: Decimal` as an input parameter.
   - Inside `buildBillScenario`, multiply `annualBill`, `annualExportRevenue`, `annualGridImportKwh`, `annualGridExportKwh`, `annualBaselineBill` by the `annualizationFactor`. Update downstream computations like `netAnnualCost` and `annualBillSavings` accordingly. Ensure that `monthlyBill`, `monthlyEnergyKwh`, `monthlyExportRevenue`, `monthlyBillSavings`, and `netMonthlyCost` are computed using the *raw unscaled* values (so they remain true monthly averages, not scaled by annualizationFactor).
   - In `calculateBillAfterSolar`, multiply the returned `aggregatedSelfConsumption.totalSolarGenerationKwh` and `aggregatedSelfConsumption.selfConsumedKwh` by the `annualizationFactor` as well.

4. **Fix Next.js Prerender Failure**:
   Add `export const dynamic = 'force-dynamic'` to the top of:
   - `apps/web/src/app/analysis/battery/config/page.tsx`
   - `apps/web/src/app/analysis/battery/dispatch/page.tsx`
   - `apps/web/src/app/analysis/battery/page.tsx`
   - `apps/web/src/app/analysis/battery/results/page.tsx`

5. **Fix Single Scale Factor base scale multiplier inconsistency**:
   In `packages/calculation-engine/src/solar-engine.ts`, under legacy single `monthlyScaleFactor` processing, multiply the scale factor by `baseScaleFactors[i]!` within the loop:
   ```typescript
   monthlyScaleFactors.push(input.monthlyScaleFactor * baseScaleFactors[i]!);
   ```

## Verification:
- Run `npm run build` from the workspace root to ensure Next.js and package builds compile.
- Run `npm run test` from the workspace root to ensure all tests pass (Vitest).
- Report back with details of changes made, build/test results, and paths of modified files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
