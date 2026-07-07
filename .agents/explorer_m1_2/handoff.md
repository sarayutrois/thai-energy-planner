# Handoff Report: Thai Energy Planner Billing and Solar Calculation Analysis

## 1. Observation

I have inspected the `packages/calculation-engine/src/solar-engine.ts` and `packages/calculation-engine/src/thai-billing.ts` files to trace the implementation of `calculateBillAfterSolar` and the monthly billing extrapolation logic.

### Key Observations

1. **`calculateBillAfterSolar` Type Definition (`solar-engine.ts` lines 703-711)**:
   ```typescript
   export function calculateBillAfterSolar(input: {
     loadIntervals: LoadIntervalInput[];
     solarIntervals: SolarGenerationIntervalInput[];
     normalTariff: TariffVersionConfig;
     touTariff: TariffVersionConfig;
     exportPolicy: ExportPolicy;
     billDate?: string | undefined;
     monthlyScaleFactor?: number | undefined;
   }): SolarBillComparison
   ```
   The function currently accepts a single optional `monthlyScaleFactor`.

2. **Scaling Logic (`solar-engine.ts` lines 728-735)**:
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
   A single representative scale factor is applied to all load and grid import intervals.

3. **Yearly Extrapolation (`solar-engine.ts` lines 1803-1832 inside `buildBillScenario`)**:
   ```typescript
   const annualBill = monthlyBill.mul(12);
   const annualExportRevenue = input.usesSolar
     ? input.monthlyExportRevenue.mul(12)
     : zero;
   // ...
   annualGridImportKwh: round(new Decimal(input.bill.energyKwh).mul(12), 6),
   annualGridExportKwh: input.usesSolar
     ? round(input.annualGridExportKwh, 6)
     : 0,
   annualBillSavingsThb: input.usesSolar
     ? round(monthlyBillSavings.mul(12), 2)
     : 0,
   netAnnualCostThb: round(netMonthlyCost.mul(12), 2),
   ```
   The engine currently calculates the bill for a single representative month and multiplies it by 12 to compute annual figures.

4. **Caller Extrapolation (`solar-engine.ts` lines 1093-1098 & lines 1598-1602)**:
   Callers like `optimizeSolarSize` and `runSolarAnalysis` extrapolate annual solar generation by multiplying the single representative month's generation by `monthlyScaleFactor` and then by 12:
   ```typescript
   annualGenerationKwh: new Decimal(
     billComparison.selfConsumption.totalSolarGenerationKwh,
   )
     .mul(monthlyScaleFactor)
     .mul(12)
     .toNumber(),
   ```

5. **`thai-billing.ts` Estimation (`thai-billing.ts` lines 353-361)**:
   ```typescript
   const comparison = calculateBillAfterSolar({
     loadIntervals: intervals,
     solarIntervals,
     normalTariff,
     touTariff,
     exportPolicy,
     billDate,
     monthlyScaleFactor: 1,
   });
   ```
   `estimateSolarFromMonthlyBill` passes `monthlyScaleFactor: 1` and relies on the `calculateBillAfterSolar` 12x multiplier to estimate annual savings.

6. **Seasonal Solar Yields (`thai-billing.ts` lines 455-458)**:
   The monthly specific yield for solar generation varies month by month:
   ```typescript
   const monthlySpecificYield =
     [112, 118, 126, 124, 118, 108, 104, 106, 110, 112, 108, 106][
       Number(month) - 1
     ] ?? 110;
   ```
   This array of 12 distinct values is defined in the assumptions snapshot, but the billing calculations currently use only a single yield factor corresponding to the start date's month and multiply the resulting monthly savings by 12.

---

## 2. Logic Chain

1. **Current Limitation**: Multiplying a single month's bill and solar yield by 12 to get annual figures (`monthlyBill.mul(12)`) assumes all months have identical scaling factors and solar generation profiles. However, solar yields (`monthlySpecificYieldKwhPerKwp`) are seasonally distinct (ranging from 104 in July to 126 in March), and monthly load scaling factors can also vary.
2. **Refactored Approach**: To achieve accurate yearly projections, `calculateBillAfterSolar` must process each of the 12 months independently using month-specific scaling factors and month-specific solar yields, then aggregate (sum) them.
3. **API Backward Compatibility**: By accepting `monthlyScaleFactors?: number[]` (array of 12 numbers) alongside `monthlyScaleFactor?: number`, we can resolve a single `monthlyScaleFactor` (or its default inferred value) into a 12-element array: `Array(12).fill(monthlyScaleFactor)`.
4. **Dates and Weekday Shifts**: TOU rate calculations are highly sensitive to weekdays vs. weekends. When running independent monthly simulations on a representative load profile (e.g. 7 days starting on a Monday), shifting the timestamps to a target month must preserve the day-of-week. We can achieve this by finding the first matching day-of-week in the target month and shifting all timestamps by that exact difference (which is always a multiple of 7 days).
5. **Direct Yield Scaling for Representative Profiles**: When scaling representative solar intervals for a target month $m$, the generation at each interval must be scaled by the specific yield ratio:
   $$\text{solarScaleRatio}_m = \frac{\text{Yield}_m}{\text{Yield}_{\text{representative}}} \times \frac{\text{daysInMonth}_{\text{representative}}}{\text{daysInMonth}_m}$$
6. **Result Aggregation**: Monthly bills, savings, and export revenues are computed independently for each month. The annual total is the sum of these 12 months, and the representative monthly values returned are the averages of the 12 months.

---

## 3. Caveats

* **Weekday/Weekend Preservation**: Shifting timestamps must be done using a whole number of weeks to ensure that weekdays do not turn into weekends (or vice versa), which would corrupt TOU peak/off-peak calculations.
* **Partial/Multi-Month Profiles**: For load profiles that already cover multiple months but not the full year, the orchestrator plan specifies that the API layer will handle filling in the missing months before calling the engine.
* **Caller Simplification**: Once `calculateBillAfterSolar` aggregates results to annual totals internally, caller functions (`optimizeSolarSize`, `runSolarAnalysis`) must be simplified to read the aggregated `totalSolarGenerationKwh` directly rather than applying `.mul(monthlyScaleFactor).mul(12)` themselves.

---

## 4. Conclusion

We can refactor `calculateBillAfterSolar` to perform independent 12-month calculations and aggregate them into yearly metrics. Below is the proposed design sketch and implementation blueprint.

### Proposed Changes

#### A. Add `solarAssumptions` and `monthlyScaleFactors` to `calculateBillAfterSolar`
Update the input signature in `packages/calculation-engine/src/solar-engine.ts`:
```typescript
export function calculateBillAfterSolar(input: {
  loadIntervals: LoadIntervalInput[];
  solarIntervals: SolarGenerationIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  exportPolicy: ExportPolicy;
  billDate?: string | undefined;
  monthlyScaleFactor?: number | undefined;
  monthlyScaleFactors?: number[] | undefined;
  solarAssumptions?: SolarAssumptions | undefined; // Required to fetch monthly yields
}): SolarBillComparison
```

#### B. Handle Representative vs. Multi-Month Profiles
1. Determine if the input profile is **multi-month** (spans more than one month) or **representative** (typically 7 or 30 days of a single month).
2. Resolve scaling factors for each month $m \in [1..12]$:
   - If `monthlyScaleFactors` (12 numbers) is provided: $SF_m = \text{monthlyScaleFactors}[m - 1]$.
   - Else if `monthlyScaleFactor` is provided: $SF_m = \text{monthlyScaleFactor}$.
   - Else (inferred):
     - For representative profiles: $SF_m = \text{daysInMonth}(m) / \text{totalUniqueDays}$.
     - For multi-month profiles: $SF_m = \text{daysInMonth}(m) / \text{uniqueDaysInMonth}_m$ (for months present in data).

#### C. Shift Timestamps (Weekday Preserving)
To shift a representative timestamp from the reference month to a target month $m$:
```typescript
function shiftProfileToMonth(
  intervals: LoadIntervalInput[],
  targetMonth: number,
  baseYear: number
): LoadIntervalInput[] {
  const firstParts = getBangkokParts(intervals[0].timestamp);
  const targetDayOfWeek = firstParts.dayOfWeek;
  
  // Find first day of target month (1 to 7) matching day of week
  let targetDay = 1;
  for (let d = 1; d <= 7; d++) {
    const dateStr = `${baseYear}-${String(targetMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const iso = localDateMinuteToBangkokIso(dateStr, 0);
    if (getBangkokParts(iso).dayOfWeek === targetDayOfWeek) {
      targetDay = d;
      break;
    }
  }

  const origMs = new Date(localDateMinuteToBangkokIso(firstParts.date, 0)).getTime();
  const targetMs = new Date(localDateMinuteToBangkokIso(`${baseYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`, 0)).getTime();
  const timeShiftMs = targetMs - origMs;

  return intervals.map(interval => ({
    ...interval,
    timestamp: new Date(new Date(interval.timestamp).getTime() + timeShiftMs).toISOString()
  }));
}
```

#### D. Loop and Aggregate
```typescript
const monthlyBillsNormalWithoutSolar: TariffCalculationResult[] = [];
const monthlyBillsTouWithoutSolar: TariffCalculationResult[] = [];
const monthlyBillsNormalWithSolar: TariffCalculationResult[] = [];
const monthlyBillsTouWithSolar: TariffCalculationResult[] = [];
const monthlyExportRevenues: Decimal[] = [];
const monthlyPhysicalExports: Decimal[] = [];
const monthlyBillableExports: Decimal[] = [];
const monthlySelfConsumptions: SolarSelfConsumptionResult[] = [];

// Determine base year and month of representative profile
const firstParts = getBangkokParts(loadIntervals[0].timestamp);
const baseYear = Number(firstParts.date.slice(0, 4));
const repMonth = Number(firstParts.date.slice(5, 7));

for (let m = 1; m <= 12; m++) {
  const sf = monthlyScaleFactors[m - 1];
  
  let monthlyLoad = loadIntervals;
  let monthlySolar = solarIntervals;

  if (isRepresentative) {
    // 1. Shift load timestamps to month m
    monthlyLoad = shiftProfileToMonth(loadIntervals, m, baseYear);
    
    // 2. Scale solar generation by specific yield ratio
    if (solarAssumptions) {
      const repYield = solarAssumptions.monthlySpecificYieldKwhPerKwp[repMonth - 1] ?? 110;
      const targetYield = solarAssumptions.monthlySpecificYieldKwhPerKwp[m - 1] ?? 110;
      const repDays = daysInMonth(firstParts.date);
      const targetDays = new Date(baseYear, m, 0).getDate();
      
      const solarScaleRatio = repYield > 0
        ? (targetYield / repYield) * (repDays / targetDays)
        : 1;

      monthlySolar = solarIntervals.map(interval => ({
        ...interval,
        generationKwh: new Decimal(interval.generationKwh).mul(solarScaleRatio).toNumber(),
        powerKw: interval.powerKw !== undefined ? new Decimal(interval.powerKw).mul(solarScaleRatio).toNumber() : undefined
      }));
      // Shift solar timestamps
      monthlySolar = shiftProfileToMonth(monthlySolar as any, m, baseYear);
    }
  } else {
    // Filter intervals belonging to month m
    monthlyLoad = loadIntervals.filter(i => Number(getBangkokParts(i.timestamp).date.slice(5, 7)) === m);
    monthlySolar = solarIntervals.filter(i => Number(getBangkokParts(i.timestamp).date.slice(5, 7)) === m);
    
    if (monthlyLoad.length === 0) continue; // Skip missing months in partial profiles
  }

  // 3. Simulate self consumption
  const selfConsumption = simulateSolarSelfConsumption({
    loadIntervals: monthlyLoad,
    solarIntervals: monthlySolar
  });
  monthlySelfConsumptions.push(selfConsumption);

  // 4. Scale intervals for billing
  const billingLoad = scaleLoadIntervals(monthlyLoad, sf);
  const billingImport = scaleGridImportIntervals(selfConsumption, sf);
  const monthlyLoadKwh = sumLoadEnergy(billingLoad);
  const monthlyImportKwh = sumLoadEnergy(billingImport);

  const monthlyPhysicalExport = new Decimal(selfConsumption.gridExportKwh).mul(sf);
  const monthlyBillableExport = sumBillableGridExport(selfConsumption, exportPolicy).mul(sf);
  const monthlyExportRevenue = exportPolicy.enabled
    ? monthlyBillableExport.mul(exportPolicy.exportRateThbPerKwh)
    : zero;

  monthlyExportRevenues.push(monthlyExportRevenue);
  monthlyPhysicalExports.push(monthlyPhysicalExport);
  monthlyBillableExports.push(monthlyBillableExport);

  // 5. Calculate bills
  const billDateStr = `${baseYear}-${String(m).padStart(2, "0")}-01`;
  
  monthlyBillsNormalWithoutSolar.push(calculateNormalBill({
    tariffVersion: normalTariff,
    billDate: billDateStr,
    energyKwh: monthlyLoadKwh.toString()
  }));
  monthlyBillsTouWithoutSolar.push(calculateTouBill({
    tariffVersion: touTariff,
    intervals: billingLoad.map(toTariffInterval)
  }));
  monthlyBillsNormalWithSolar.push(calculateNormalBill({
    tariffVersion: normalTariff,
    billDate: billDateStr,
    energyKwh: monthlyImportKwh.toString()
  }));
  monthlyBillsTouWithSolar.push(calculateTouBill({
    tariffVersion: touTariff,
    intervals: billingImport.map(toTariffInterval)
  }));
}

// 6. Aggregate to annual totals and average monthly records
// ... (calculate sum of grand totals, savings, export revenues, imports and construct aggregated TariffCalculationResult objects)
```

---

## 5. Verification Method

1. **Compilation Check**: Run the TypeScript compiler to ensure code builds:
   ```powershell
   npm run build:packages
   ```
2. **Execute Existing Tests**:
   Ensure existing unit tests in `@thai-energy-planner/calculation-engine` pass. The tests pass a single `monthlyScaleFactor` (e.g. `1`), which resolves to `Array(12).fill(1)`, producing identical numerical behavior as the old `mul(12)` implementation:
   ```powershell
   npm --workspace=@thai-energy-planner/calculation-engine test
   ```
3. **Write E2E Verification Unit Test**:
   Create a test passing 12 distinct scale factors (e.g. `[1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1]`) and distinct solar specific yields, and assert that the returned `annualBillThb` matches the exact sum of the 12 independently calculated monthly bills.
