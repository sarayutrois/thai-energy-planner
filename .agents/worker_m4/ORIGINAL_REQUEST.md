## 2026-07-08T20:48:49Z
Implement the API/web upgrades for automatic monthly averaging, and resolve three critical calculation engine bugs.
1. Reference the findings in the explorer handoffs and the Challenger 2 handoff:
   - `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\explorer_m1_3\handoff.md`
   - `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\challenger_m3_2\handoff.md`
2. Implement Feature 2 (Automatic Monthly Averaging for Incomplete Bills):
   - Modify Zod validation schema in `apps/web/src/lib/calculation-api.ts` to support receiving monthly bills via a new optional `monthlyBills` array of `{ month: string; billThb: number }` on the request objects.
   - Implement logic in `runEstimateApiCalculation` / `runSolarAnalyzeApiCalculation` or a central helper function:
     - Check if `monthlyBills` array is provided and not empty. Validate it has length 1–12, valid formats, non-negative amounts, and unique months.
     - Sort bills chronologically.
     - Calculate the average cost from the provided months.
     - Fill/pad the missing months of the 12-month rolling period using the calculated average (reference the earliest month, generate the full 12-month timeline, and pad missing months).
     - Map this padded 12-month array of values into `monthlyScaleFactors` (e.g. mapping energy consumption scaling proportionally) or feed the averaged bills into the calculation engine.
3. Fix the 3 critical engine bugs identified in Challenger 2 handoff:
   - Bug 1 (Unscaled Peak Power): Update `scaleLoadIntervals` and `scaleGridImportIntervals` in `packages/calculation-engine/src/solar-engine.ts`, and `scaleIntervals` in `packages/calculation-engine/src/battery-ev-engine.ts`, to scale `powerKw` by the `factor` (using `Decimal` multiplication where applicable) rather than leaving it unscaled.
   - Bug 2 (Zero Demand Charges): Retrieve/compute peak demand from scaled load/import intervals and pass it as the `demandKw` argument to `calculateNormalBill` and `calculateTouBill` within `packages/calculation-engine/src/solar-engine.ts`.
   - Bug 3 (Independent Load/Solar Shifting Misalignment): In `calculateBillAfterSolar` in `packages/calculation-engine/src/solar-engine.ts`, compute the `timeShiftMs` based on the load profile's first interval and use the *same* `timeShiftMs` offset for shifting both load and solar profiles, rather than recalculating shifts independently.
4. Enable all the yearly Vitest tests:
   - Unskip all tests in `packages/calculation-engine/src/solar-engine-yearly.test.ts`.
   - Unskip all tests in `apps/web/src/lib/calculation-api-yearly.test.ts`.
5. Run the full test suite using `npm run test` and check compilation using `npm run build` to verify all 27 new tests and existing unit tests compile and pass successfully.
6. Mandatory Integrity Warning: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task.
7. Write your handoff.md detailing what you modified and build/test execution results. Send a message to the orchestrator (conversation ID: 211132e5-d733-4f54-b864-f2bd7bfba20c) when done.
