# Handoff Report: Empirically Challenging Calculation Engine Upgrades

## 1. Observation
I reviewed the calculation engine package (`@thai-energy-planner/calculation-engine`) located in `packages/calculation-engine`. Specifically, I traced the date shifting, yield scaling, scale factor validation, and billing calculations.

### Observation 1: Date Shifting Logic (`shiftProfileToMonth`)
In `packages/calculation-engine/src/solar-engine.ts`, lines 705–738:
```typescript
function shiftProfileToMonth<T extends { timestamp: string }>(
  intervals: T[],
  targetMonth: number,
  baseYear: number,
): T[] {
  if (intervals.length === 0) return [];
  const firstInterval = intervals[0]!;
  const firstParts = getBangkokParts(firstInterval.timestamp);
  const targetDayOfWeek = firstParts.dayOfWeek;

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
  const targetMs = new Date(
    localDateMinuteToBangkokIso(
      `${baseYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`,
      0,
    ),
  ).getTime();
  const timeShiftMs = targetMs - origMs;

  return intervals.map((interval) => ({
    ...interval,
    timestamp: new Date(new Date(interval.timestamp).getTime() + timeShiftMs).toISOString(),
  }));
}
```

### Observation 2: Specific Yield Index Matching
In `packages/calculation-engine/src/solar-engine.ts`, lines 934–935:
```typescript
const repYield = input.solarAssumptions.monthlySpecificYieldKwhPerKwp[repMonth - 1] ?? 110;
const targetYield = input.solarAssumptions.monthlySpecificYieldKwhPerKwp[m - 1] ?? 110;
```

### Observation 3: Unscaled `powerKw` under Scale Factors
In `packages/calculation-engine/src/solar-engine.ts`, lines 2240–2266:
```typescript
function scaleLoadIntervals(
  intervals: LoadIntervalInput[],
  factor: number,
): LoadIntervalInput[] {
  return intervals.map((interval) => {
    const energy = new Decimal(interval.energyKwh).mul(factor);
    return {
      timestamp: interval.timestamp,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      ...(interval.powerKw === undefined ? {} : { powerKw: interval.powerKw }),
    };
  });
}

function scaleGridImportIntervals(
  result: SolarSelfConsumptionResult,
  factor: number,
): LoadIntervalInput[] {
  return result.intervalResults.map((interval) => {
    const energy = new Decimal(interval.gridImportKwh).mul(factor);
    return {
      timestamp: interval.timestamp,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      powerKw: interval.gridImportPowerKw,
    };
  });
}
```
*Note: A similar issue occurs in EV engine's `scaleIntervals` inside `packages/calculation-engine/src/battery-ev-engine.ts` (line 1565).*

### Observation 4: Missing `demandKw` Argument in Billing Engine Calls
In `packages/calculation-engine/src/solar-engine.ts`, lines 982–1007:
```typescript
    monthlyBillsNormalWithoutSolar.push(
      calculateNormalBill({
        tariffVersion: normalTariff,
        billDate,
        energyKwh: monthlyLoadKwh.toString(),
      }),
    );
    monthlyBillsTouWithoutSolar.push(
      calculateTouBill({
        tariffVersion: touTariff,
        intervals: billingLoad.map(toTariffInterval),
      }),
    );
```
No `demandKw` argument is provided to `calculateNormalBill` or `calculateTouBill`, causing them to fall back to `undefined` and calculate demand charges as `0.00`.

### Observation 5: Scale Factor Boundary Validation
In `packages/calculation-engine/src/solar-engine.ts`, lines 895–912:
```typescript
  if (input.monthlyScaleFactors) {
    if (input.monthlyScaleFactors.length !== 12) {
      throw new Error("monthlyScaleFactors must have exactly 12 elements");
    }
    if (input.monthlyScaleFactors.some((v) => v === null || v === undefined)) {
      throw new Error("Scale factors cannot contain undefined or null");
    }
    if (input.monthlyScaleFactors.some((v) => v < 0)) {
      throw new Error("Scale factors cannot be negative");
    }
```

---

## 2. Logic Chain
1. **Weekday/Weekend Preservation**:
   - `shiftProfileToMonth` aligns the first day of the target month with the day of the week of `firstInterval.timestamp` (Observation 1).
   - Because Bangkok timezone (UTC+7) does not observe Daylight Saving Time, all days are exactly 24 hours (86,400,000 ms).
   - Thus, the difference `timeShiftMs` represents an exact integer multiple of 7 days (weeks).
   - Shifting all intervals by `timeShiftMs` preserves the day of week perfectly for TOU pricing.
2. **Specific Yield Target Matching**:
   - The loop runs 1-indexed month `m` from 1 to 12.
   - `repYield` is retrieved using `repMonth - 1` and `targetYield` is retrieved using `m - 1` (Observation 2).
   - Since JavaScript arrays are 0-indexed, this correctly matches target specific yields.
3. **Scale Factor Vulnerability**:
   - `scaleLoadIntervals` and `scaleGridImportIntervals` multiply `energyKwh` by the scale factor but leave the `powerKw` (peak power) field unscaled (Observation 3).
   - Under demand-charge tariffs, peak kW demand is used to calculate demand charges. If `powerKw` remains unscaled, the demand charge will be calculated on the baseline load's peak rather than the scaled load's peak.
4. **Billing Demand Charge Vulnerability**:
   - Billing functions require a `demandKw` parameter to calculate demand charges (Observation 4).
   - The calculation engine never passes `demandKw`, resulting in demand charges always being calculated as `0.00` even for commercial/industrial segments.

---

## 3. Caveats
- Runtime test executions via `npm run test` were not completed because terminal execution permissions timed out waiting for user input. All findings are derived via rigorous static analysis and tracing of the TypeScript source code.
- Representative profile shifting can spill over into the next month (e.g., shifting Jan 31-day profile to Feb). While month-length scaling factors adjust energy correctly, this spillover means February's simulated peak power might be derived from shifted March days.

---

## 4. Conclusion
The calculation engine successfully preserves weekday/weekend distributions during date shifts and correctly matches target monthly yields. However, we identified two critical bugs and one misalignment risk:
1. **Critical Bug (Unscaled Peak Power)**: Load and import scaling functions do not multiply the `powerKw` field by the scale factor, leaving peak kW unscaled.
2. **Critical Bug (Zero Demand Charges)**: The calculation engine never passes `demandKw` to the tariff engine billing calls, causing demand charges to default to zero for all users.
3. **High Risk (Load/Solar Misalignment)**: `shiftProfileToMonth` calculates shifts independently for `loadIntervals` and `solarIntervals`. If their first interval timestamps differ in day of week, they will be shifted by different offsets, destroying their alignment.

---

## 5. Verification Method
To verify these bugs:
1. **Verify Unscaled Peak Power**:
   - Check `packages/calculation-engine/src/solar-engine.ts` at line 2240. Notice `powerKw` is returned directly without multiplication by `factor`.
2. **Verify Zero Demand Charges**:
   - Check `packages/calculation-engine/src/solar-engine.ts` lines 982-1007. Observe that `calculateTouBill` and `calculateNormalBill` arguments lack the `demandKw` parameter.
3. **Verify Load/Solar Misalignment**:
   - Create a test where `loadIntervals` starts on a Monday (e.g., `2026-01-05`) and `solarIntervals` starts on a Thursday (e.g., `2026-01-01`). Check that `shiftProfileToMonth` shifts them by different offsets (28 days vs 35 days), leading to empty self-consumption overlaps in February.

---

## Adversarial Challenge Report

### Challenge Summary
**Overall risk assessment**: HIGH (Due to incorrect billing calculations for demand charges and potential load/solar misalignment).

### Challenges

#### [Critical] Challenge 1: Unscaled Peak Power (`powerKw`)
- **Assumption challenged**: Scaling a load profile only scales its energy usage.
- **Attack scenario**: A consumer scales their electricity consumption by 2x. The billing simulation calculates double the energy charges, but demand charge (which depends on peak kW) is calculated on the original 1x peak because `powerKw` is not scaled.
- **Blast radius**: Business customers on peak demand tariffs will receive incorrect (under-calculated) bill projections.
- **Mitigation**: Update `scaleLoadIntervals`, `scaleGridImportIntervals`, and EV engine's `scaleIntervals` to scale `powerKw` by the same factor:
  ```typescript
  powerKw: interval.powerKw !== undefined ? new Decimal(interval.powerKw).mul(factor).toDecimalPlaces(6).toNumber() : undefined
  ```

#### [Critical] Challenge 2: Missing `demandKw` in Billing Engine Calls
- **Assumption challenged**: The billing engine automatically determines peak demand charges from interval arrays.
- **Attack scenario**: A TOU or normal billing calculation is run for Category 3 (Medium Business) which has demand charges. Because `demandKw` is omitted in the billing parameters, the demand charge is computed as 0.
- **Blast radius**: Billing simulations for commercial users will completely omit demand charges.
- **Mitigation**: Compute the peak demand (e.g., maximum `powerKw` during peak hours for TOU, or overall for normal tariff) from the scaled intervals and pass it as `demandKw` to `calculateNormalBill` and `calculateTouBill`.

#### [High] Challenge 3: Independent Load/Solar Shifting Misalignment
- **Assumption challenged**: Load and solar profiles will always have identical start days and offsets.
- **Attack scenario**: Load profile starts on Monday Jan 5. Solar profile starts on Thursday Jan 1. Shifting load to February applies a 28-day shift, shifting solar applies a 35-day shift. Jan 5 load now matches with Jan 12 solar, destroying the temporal correlation of self-consumption.
- **Blast radius**: Highly inaccurate self-consumption, grid exports, and savings calculations.
- **Mitigation**: Compute `timeShiftMs` using the load profile's first interval, and pass that same `timeShiftMs` as a parameter to both load and solar shifting, rather than recalculating it from solar's first interval.
