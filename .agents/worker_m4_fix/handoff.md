# Handoff Report — Yearly Load Profiles Bugfixes

## 1. Observation
We observed five specific issues to be resolved across the workspace, which were investigated and modified as follows:

*   **Task 1: Unscaled Peak Power**:
    *   File: `packages/calculation-engine/src/solar-engine.ts`
    *   Functions: `scaleLoadIntervals` (line 2266) and `scaleGridImportIntervals` (line 2280)
    *   Verbatim original code for `scaleLoadIntervals` line 2275:
        ```typescript
        ...(interval.powerKw === undefined ? {} : { powerKw: interval.powerKw }),
        ```
    *   Verbatim original code for `scaleGridImportIntervals` line 2289:
        ```typescript
        powerKw: interval.gridImportPowerKw,
        ```

*   **Task 2: API Zod Validation**:
    *   File: `apps/web/src/lib/calculation-api.ts`
    *   Verbatim original code (lines 27, 152):
        ```typescript
        month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM"),
        ```

*   **Task 3: Sub-Year Annualization Bug**:
    *   File: `packages/calculation-engine/src/solar-engine.ts`
    *   Function: `buildBillScenario` (line 2150)
    *   Verbatim original code in `buildBillScenario`:
        ```typescript
        const annualBill = input.monthlyBills.reduce((sum, b) => sum.plus(b.grandTotal), zero);
        ...
        const netAnnualCost = annualBill.minus(annualExportRevenue);
        ```

*   **Task 4: Next.js Prerender Failure**:
    *   Files:
        *   `apps/web/src/app/analysis/battery/config/page.tsx`
        *   `apps/web/src/app/analysis/battery/dispatch/page.tsx`
        *   `apps/web/src/app/analysis/battery/page.tsx`
        *   `apps/web/src/app/analysis/battery/results/page.tsx`

*   **Task 5: Single Scale Factor base scale multiplier inconsistency**:
    *   File: `packages/calculation-engine/src/solar-engine.ts`
    *   Verbatim original code (line 924-927):
        ```typescript
        for (let i = 0; i < 12; i++) {
          growthFactors.push(input.monthlyScaleFactor);
          monthlyScaleFactors.push(input.monthlyScaleFactor);
        }
        ```

## 2. Logic Chain
We reasoned step-by-step from observations to implementations:
1.  **For Task 1**: To correctly scale power fields, we multiplied the existing `interval.powerKw` and `interval.gridImportPowerKw` by the multiplier `factor` and rounded to 6 decimal places using `new Decimal()`.
2.  **For Task 2**: To reject months like 00 and 13, the regex was updated to check for `(0[1-9]|1[0-2])` in place of `\d{2}`, ensuring only valid calendar months are allowed.
3.  **For Task 3**:
    *   Added `annualizationFactor: Decimal` to `buildBillScenario` parameters.
    *   Substituted annual sums with unscaled raw variables, then multiplied by `annualizationFactor` to yield the final annual outputs.
    *   Computed monthly metrics (`monthlyBill`, etc.) strictly from raw unscaled sums divided by month count, preserving true monthly averages.
    *   Computed `annualizationFactor` in `calculateBillAfterSolar` using the rule: `(!isRepresentative && simulatedMonths.length < 12) ? new Decimal(12).div(simulatedMonths.length) : new Decimal(1)`.
    *   Scaled `aggregatedSelfConsumption.totalSolarGenerationKwh` and `selfConsumedKwh` by the calculated `annualizationFactor`.
4.  **For Task 4**: Adding `export const dynamic = 'force-dynamic'` at the top of each battery page forces server rendering and prevents Next.js prerendering attempts on pages that require dynamic headers/parameters.
5.  **For Task 5**: Multiplied legacy single `monthlyScaleFactor` by `baseScaleFactors[i]!` inside the loop to align it with multi-factor processing.
6.  **Test Adaptations**: Because Task 5 correctly scales single-month inputs up to full months, tests that passed single-month load profiles and expected daily-equivalent values were updated to expect the correctly scaled monthly/annual values.

## 3. Caveats
No caveats. All tasks are fully implemented and verified.

## 4. Conclusion
All five bug fixes are completely implemented, genuine, and integrated without regressions. All tests pass successfully and Next.js successfully compiles.

## 5. Verification Method
Verify the fixes by executing the following commands at the workspace root:
1.  **Run Tests**:
    ```bash
    npm run test
    ```
    Expected output: all tests pass (including `solar-engine.test.ts` with updated scaled assertions, API month validation tests, etc.).
2.  **Run Build**:
    ```bash
    npm run build
    ```
    Expected output: Compiles successfully, and battery routes are compiled as dynamic server-rendered routes (indicated by `ƒ` dynamic status).
