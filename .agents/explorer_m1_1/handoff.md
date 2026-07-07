# Handoff Report: Thai Energy Planner Calculation Engine Inputs Analysis

## 1. Observation
I have inspected the `packages/calculation-engine` and the `apps/web` packages to identify all occurrences, structure, and usage of `SolarAnalysisInput`, specifically in relation to `monthlyScaleFactor`.

### SolarAnalysisInput Definition
In `packages/calculation-engine/src/solar-engine.ts` (lines 338-349), `SolarAnalysisInput` is defined as:
```typescript
export type SolarAnalysisInput = {
  loadIntervals: LoadIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  solarAssumptions: SolarAssumptions;
  exportPolicy: ExportPolicy;
  financialAssumptions: FinancialAssumptions;
  billDate?: string | undefined;
  monthlyScaleFactor?: number | undefined;
  solarProfile?: SolarGenerationIntervalInput[] | undefined;
  modelDetailLevel?: SolarModelDetailLevel | undefined;
};
```
Currently, the scaling factor is represented by a single optional property: `monthlyScaleFactor?: number | undefined;`.

### SolarAnalysisInput Usages
Within `packages/calculation-engine`, `SolarAnalysisInput` is used in:
1. **Type Definition**: `packages/calculation-engine/src/solar-engine.ts:338`
2. **Analysis Execution Parameter**: `packages/calculation-engine/src/solar-engine.ts:1571`
   ```typescript
   export function runSolarAnalysis(
     input: SolarAnalysisInput,
   ): SolarAnalysisResult {
   ```
3. **Demo Input Creator Return Type**: `packages/calculation-engine/src/solar-engine.ts:1679`
   ```typescript
   ): SolarAnalysisInput {
   ```

Within other packages, it is imported and used in:
- `apps/web/src/lib/solar-demo.ts` (lines 4, 61, 103)
- `apps/web/src/lib/calculation-api.ts` (lines 4, 176, 208)

### Current Scaling Factor & Yearly Extrapolation Logic
In `packages/calculation-engine/src/solar-engine.ts`, the single `monthlyScaleFactor` is used to scale a short interval data set (e.g. 7 days) to a full month, and then that month's results are multiplied by 12 to extrapolate annual figures:
- **Scaling intervals** (lines 728-735 in `calculateBillAfterSolar`):
  ```typescript
  const billingLoadIntervals = scaleLoadIntervals(
    loadIntervals,
    monthlyScaleFactor,
  );
  const billingImportIntervals = scaleGridImportIntervals(
    selfConsumption,
    monthlyScaleFactor,
  );
  ```
- **Extrapolating annual figures** (lines 1803-1832 in `buildBillScenario`):
  ```typescript
  const annualBill = monthlyBill.mul(12);
  const annualExportRevenue = input.usesSolar
    ? input.monthlyExportRevenue.mul(12)
    : zero;
  ...
  annualGridImportKwh: round(new Decimal(input.bill.energyKwh).mul(12), 6),
  annualGridExportKwh: input.usesSolar
    ? round(input.annualGridExportKwh, 6)
    : 0,
  annualBillSavingsThb: input.usesSolar
    ? round(monthlyBillSavings.mul(12), 2)
    : 0,
  netAnnualCostThb: round(netMonthlyCost.mul(12), 2),
  ```
- **Financial / Sizing extrapolation** (lines 1093-1098 & 1104-1114 in `optimizeSolarSize`):
  ```typescript
  annualGenerationKwh: new Decimal(
    billComparison.selfConsumption.totalSolarGenerationKwh,
  )
    .mul(monthlyScaleFactor)
    .mul(12)
    .toNumber(),
  ```

---

## 2. Logic Chain
1. **Limitation of current design**: Extrapolating the annual bill by multiplying a single month by 12 (`monthlyBill.mul(12)`) assumes all months have the same scale factor and solar yield.
2. **Monthly variation**: However, solar yields (`monthlySpecificYieldKwhPerKwp`) are already defined as an array of 12 distinct values (representing seasonal solar changes), and load scale factors may vary month-by-month (representing seasonal consumption changes).
3. **Upgrade requirement**: To resolve this, `SolarAnalysisInput` must support `monthlyScaleFactors` as a 12-element array of numbers (one for each calendar month).
4. **Calculations refactoring**: The core functions (`calculateBillAfterSolar`) should loop through each of the 12 months independently, applying the month-specific scale factor and month-specific solar yield, and then sum the 12 monthly results together to obtain the true annual total.

---

## 3. Caveats
- **Weekday/Weekend Shifts**: Shifting timestamps to different months to calculate TOU rates may alter the distribution of weekends/weekdays unless the day-of-week alignment is preserved or simulated carefully.
- **Backward Compatibility**: Existing clients and tests pass `monthlyScaleFactor` as a single number. We must map a single `monthlyScaleFactor` to a 12-element array `Array(12).fill(monthlyScaleFactor)` to avoid breaking existing integrations.
- **Inference logic**: When no scale factor is provided, the inference logic should generate a 12-element array, scaling the base inferred factor by the length of each target month (e.g. 28 days for Feb, 31 for Jan).

---

## 4. Conclusion
Upgrade `SolarAnalysisInput` and core functions using the following steps:
1. Update `SolarAnalysisInput` type definition to include `monthlyScaleFactors?: number[] | undefined;`. Keep `monthlyScaleFactor?: number` for backward compatibility.
2. Update the input resolution/validation logic to ensure `monthlyScaleFactors` has exactly 12 non-negative numbers. If only `monthlyScaleFactor` is provided, resolve it to `Array(12).fill(monthlyScaleFactor)`.
3. Refactor `calculateBillAfterSolar` to perform a 12-month loop (month 0 to 11). For each month, shift timestamps, scale intervals by `monthlyScaleFactors[month]`, calculate the bills using the month's specific solar yield and tariff, and aggregate (sum) all monthly results to build the annual metrics instead of using `.mul(12)`.

---

## 5. Verification Method
1. **Compilation & Unit Tests**: Run the existing test suite to verify no regressions:
   ```powershell
   npm run build:packages
   npm --workspace=@thai-energy-planner/calculation-engine test
   ```
2. **E2E Integration Validation**:
   - Check that `packages/calculation-engine/src/solar-engine.test.ts` passes.
   - Write a new test passing an array of 12 distinct `monthlyScaleFactors` (e.g. `[1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1]`) and assert that the computed annual bill equals the sum of each independent month's bill.
