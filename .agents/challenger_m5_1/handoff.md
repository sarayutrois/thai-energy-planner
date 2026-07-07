# Handoff Report — Yearly Profile Upgrade Empirical Challenge

## 1. Observation

### Test Execution Results
The entire test suite builds and runs successfully. 
Command run: `npm run test`
Results:
- `@thai-energy-planner/calculation-engine`: 123 tests passed, including 19 tests in `packages/calculation-engine/src/solar-engine-yearly.test.ts`.
- `@thai-energy-planner/report-engine`: 7 tests passed.
- `@thai-energy-planner/shared-types`: 4 tests passed.
- `@thai-energy-planner/tariff-engine`: 33 tests passed.
- `@thai-energy-planner/web` (`apps/web`): 19 tests passed, including 13 tests in `apps/web/src/lib/calculation-api-yearly.test.ts`.

All 10 tests in `apps/web/src/lib/yearly-upgrade-challenger.test.ts` also passed when executed separately via `npx vitest run apps/web/src/lib/yearly-upgrade-challenger.test.ts`.
The production build compiles successfully via `npm run build` with no compilation or TypeScript errors.

---

### Bug 1: Unscaled `powerKw` (Peak Demand) — FAILED TO FIX IN SOLAR-ENGINE
In `packages/calculation-engine/src/solar-engine.ts`, the functions `scaleLoadIntervals` (line 2266) and `scaleGridImportIntervals` (line 2280) still do not scale the `powerKw` field:

```typescript
// packages/calculation-engine/src/solar-engine.ts (lines 2266-2278)
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

// packages/calculation-engine/src/solar-engine.ts (lines 2280-2292)
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

As shown, `interval.powerKw` and `interval.gridImportPowerKw` are returned unchanged without multiplication by the `factor`.

For comparison, this was successfully fixed in `packages/calculation-engine/src/battery-ev-engine.ts` (line 1565):

```typescript
// packages/calculation-engine/src/battery-ev-engine.ts (lines 1565-1577)
function scaleIntervals(intervals: LoadIntervalInput[], factor: number) {
  return intervals.map((interval) => {
    const energy = new Decimal(interval.energyKwh).mul(factor);
    const powerKw = interval.powerKw !== undefined
      ? new Decimal(interval.powerKw).mul(factor).toDecimalPlaces(6).toNumber()
      : undefined;
    return {
      ...interval,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      ...(powerKw === undefined ? {} : { powerKw }),
    };
  });
}
```

---

### Bug 2: Zero Demand Charges — PARTIALLY FIXED
In `packages/calculation-engine/src/solar-engine.ts` (lines 1000-1033), peak load/import demand is calculated and passed to the billing functions:

```typescript
    const peakLoadKw = billingLoad.reduce((max, i) => Math.max(max, i.powerKw ?? 0), 0);
    const peakImportKw = billingImport.reduce((max, i) => Math.max(max, i.powerKw ?? 0), 0);

    monthlyBillsNormalWithoutSolar.push(
      calculateNormalBill({
        tariffVersion: normalTariff,
        billDate,
        energyKwh: monthlyLoadKwh.toString(),
        demandKw: peakLoadKw,
      }),
    );
```

While demand charges are no longer zero (since `demandKw` is now passed), they are **incorrectly calculated** because `peakLoadKw` and `peakImportKw` are derived from the unscaled arrays from `scaleLoadIntervals` and `scaleGridImportIntervals`. Thus, billing calculations use unscaled demand figures.

---

### Bug 3: Independent Load/Solar Shifting Misalignment — FIXED
In `packages/calculation-engine/src/solar-engine.ts` (lines 948-967), the `timeShiftMs` offset is calculated once based on the load profile and then reused for both profiles:

```typescript
    if (isRepresentative) {
      const timeShiftMs = loadIntervals.length > 0 ? getShiftMs(loadIntervals[0]!.timestamp, m, baseYear) : 0;
      monthlyLoad = shiftProfileToMonth(loadIntervals, m, baseYear, timeShiftMs);
      ...
      monthlySolar = shiftProfileToMonth(monthlySolar, m, baseYear, timeShiftMs);
    }
```

This guarantees that both load and solar intervals shift by the exact same millisecond offset, keeping their interval timestamps perfectly aligned.

---

### Vulnerability 1: Weak Zod Regex in Month Parsing
In `apps/web/src/lib/calculation-api.ts` (line 27), the month string schema is:
```typescript
month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM"),
```
This regex only verifies character formatting, not logical month bounds. As confirmed by the execution of `yearly-upgrade-challenger.test.ts`, inputs like `"2026-13"` and `"2026-00"` successfully pass Zod schema validation:
- `"2026-13"` is mapped by `processMonthlyBills` to 2027 months because `startMonth = 13` triggers `month > 12` wrapping logic.
- `"2026-00"` is processed with `month = 0`, causing the array index scaling factors mapping to write to index `-1` on the `scaleFactors` array:
  `scaleFactors[monthNum - 1] = ...` (effectively `scaleFactors[-1] = ...`), bypassing standard validation but creating an invalid object structure.

---

## 2. Logic Chain

1. **Assertion**: Bug 1 (Unscaled `powerKw`) remains present in the solar engine.
   - **Reasoning**: We observed in `packages/calculation-engine/src/solar-engine.ts` that both `scaleLoadIntervals` and `scaleGridImportIntervals` map intervals without multiplying the `powerKw` fields by `factor`.
2. **Assertion**: Bug 2 (Zero Demand Charges) is only partially resolved and produces mathematically incorrect billing costs.
   - **Reasoning**: Since `scaleLoadIntervals` and `scaleGridImportIntervals` leave the intervals' `powerKw` fields unscaled, reducing them via `Math.max` yields unscaled peak demands (`peakLoadKw` and `peakImportKw`). Passing these unscaled peaks as the `demandKw` parameter to `calculateNormalBill` and `calculateTouBill` results in demand charges calculated using baseline peak demands, completely ignoring any load scaling factors.
3. **Assertion**: Bug 3 (Shifting Misalignment) is fully resolved.
   - **Reasoning**: The time offset `timeShiftMs` is calculated once per month based on the load profile's first interval and applied uniformly to both profiles.
4. **Assertion**: Zod validation allows invalid calendar months to bypass validation.
   - **Reasoning**: The regex `/^\d{4}-\d{2}$/` does not restrict the month digits to `01`-`12`, allowing values like `13` or `00` to be accepted and parsed by the API layer.

---

## 3. Caveats

- We operated in a review-only context and did not modify implementation code to fix these issues.
- The project's overall type safety is intact, and type check/build steps pass.
- No other potential schema vulnerabilities in other API inputs were explored.

---

## 4. Conclusion

The Yearly Profile Upgrade compiles and builds correctly, and all existing and yearly tests pass. 
However, **Bug 1 (Unscaled Peak Power) has not been fixed in `packages/calculation-engine/src/solar-engine.ts`**. As a consequence, **Bug 2 (Zero Demand Charges) is only partially resolved**, leading to incorrect billing totals when scale factors other than `1.0` are used. Bug 3 is successfully fixed. Additionally, a Zod schema validation vulnerability exists where out-of-range month strings are parsed successfully instead of being rejected.

---

## 5. Verification Method

To verify these results:
1. View `packages/calculation-engine/src/solar-engine.ts` and inspect lines 2266-2292 to confirm `powerKw` is not scaled.
2. Run `npm run test` to verify that all existing tests pass successfully.
3. Run `npx vitest run apps/web/src/lib/yearly-upgrade-challenger.test.ts` and inspect the console output of the "Zod Schema Vulnerability Challenge" test to verify that month strings like `"2026-00"` and `"2026-13"` are parsed successfully.
