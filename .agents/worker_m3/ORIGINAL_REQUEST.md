## 2026-07-08T03:16:51Z
You are a teamwork_preview_worker. Your working directory is `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\worker_m3\`.
Task: Implement the calculation engine upgrades to support 12-month independent load profiles and variable yields.
1. Reference findings and designs in:
   - `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\explorer_m1_1\handoff.md`
   - `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\explorer_m1_2\handoff.md`
2. Update `packages/calculation-engine/src/solar-engine.ts`:
   - Upgrade `SolarAnalysisInput` to support `monthlyScaleFactors?: number[] | undefined;`.
   - Update `calculateBillAfterSolar` signature to accept `monthlyScaleFactors?: number[] | undefined;` and `solarAssumptions?: SolarAssumptions | undefined;`.
   - Modify `calculateBillAfterSolar` to perform independent 12-month loop calculations and aggregate results (annual bills, savings, grid imports/exports, export revenues) as described in the Explorer 2 design.
   - Refactor timestamp shifting to preserve weekdays/weekends using the `shiftProfileToMonth` logic from Explorer 2's design.
   - Scale solar intervals by the specific yield ratio for each month (Mar-May high, Jul-Sep low, etc.) when running on representative profiles using the formula from Explorer 2.
   - Simplify callers (like `optimizeSolarSize`, `runSolarAnalysis`) to read the aggregated `totalSolarGenerationKwh` and bill savings from the updated `calculateBillAfterSolar` output rather than multiplying the single month values by 12.
3. Update `packages/calculation-engine/src/thai-billing.ts` to ensure it integrates correctly with the updated engine and uses the resolved/aggregated calculations.
4. Enable the core engine unit tests in `packages/calculation-engine/src/solar-engine-yearly.test.ts` (unskip the tests) and verify they compile and pass.
5. Run the existing tests using `npm run test` and compilation using `npm run build` to verify no regressions were introduced.
6. Mandatory Integrity Warning: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task.
7. Write your handoff.md detailing what you changed and the build/test execution results. Send a message to the orchestrator (conversation ID: 211132e5-d733-4f54-b864-f2bd7bfba20c) when done.
