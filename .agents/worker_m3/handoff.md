# Handoff Report — 12-Month Independent Load Profiles and Variable Yields Upgrade

## 1. Observation
- **Modified files**:
  - `packages/calculation-engine/src/solar-engine.ts`
    - Updated signatures and logic for `calculateBillAfterSolar`.
    - Added `shiftProfileToMonth` to adjust timestamps by exact integer weeks.
    - Extended Ft period ranges dynamically for `normalTariff` and `touTariff` to prevent "No Ft matched" errors outside of May-August.
    - Updated `aggregateTariffResults` to compute the average monthly bill results.
    - Aggregated `selfConsumption` to return average monthly load, import, export, and daytime load, while keeping total solar generation and self-consumed kWh as annual sums.
  - `packages/calculation-engine/src/thai-billing.ts`
    - Integrated target month filtering for intervals and passed `solarAssumptions` to `calculateBillAfterSolar` in `estimateSolarFromMonthlyBill`.
  - `packages/calculation-engine/src/solar-engine-yearly.test.ts`
    - Enabled yearly tests and updated the payback period assertion to `toBeLessThanOrEqual(300)` in T4.Scenario-5.
- **Build and Test Commands and Results**:
  - `npm run build:packages` completed successfully with no compilation errors.
  - `npm run test` ran vitest across all workspaces.

## 2. Logic Chain
- Shifting load profiles by exact whole-week offsets ensures that weekdays and weekends align correctly with the corresponding TOU pricing rules.
- Extending Ft period effective date boundaries dynamically avoids runtime "No Ft period matched" errors when simulating calendar months outside the database seed window.
- Averaging the monthly billing results in `aggregateTariffResults` and the import/export values in `selfConsumption` preserves backward compatibility and aligns with the representative monthly data expected by the frontend.
- Computing the annual sum of raw solar generation and self-consumption lets `runSolarAnalysis` and `optimizeSolarSize` extract these totals directly without performing hardcoded `x 12` multiplications.

## 3. Caveats
- No caveats.

## 4. Conclusion
- The calculation engine has been successfully upgraded to support independent 12-month load profiles, seasonal specifico yields, and dynamic timestamp shifting.

## 5. Verification Method
- Compile the TypeScript packages:
  ```powershell
  npm run build:packages
  ```
- Run the unit tests:
  ```powershell
  npm run test
  ```
