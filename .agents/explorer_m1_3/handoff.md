# Handoff Report: Thai Energy Planner Calculation API & Bill Processing Investigation

## 1. Observation
The following file paths, line numbers, and implementation details were observed in the codebase:
- **`apps/web/src/lib/calculation-api.ts`**:
  - **Schema Validation**: Lines 21–30 define `estimateRequestSchema` validating a single `monthlyBillThb` field (type `z.number().positive().max(1_000_000)`). Lines 69–114 define `solarAnalyzeRequestSchema` validating detailed parameters, including `loadIntervals` and `solarProfile` arrays.
  - **Estimate Processing**: Lines 131–171 define `runEstimateApiCalculation(request)`, which extracts input parameters, resolves the electric authority and customer segment via `resolveTariffScope(request.province, request.propertyType)` (lines 231-243), and invokes the calculation engine's `estimateSolarFromMonthlyBill` function (line 133).
  - **Analysis Processing**: Lines 173–222 define `runSolarAnalyzeApiCalculation(request)`, which maps high-resolution load intervals or generates them from demo profiles, queries tariff configurations via `getOfficialThaiTariffPair` using the inferred parameters, and runs `runSolarAnalysis(demoInput)` (line 208).
- **`apps/web/src/lib/calculation-api.test.ts`**:
  - Lines 9–103 verify inputs are properly validated before invocation (e.g. rejecting negative bills on line 12, empty load profiles on line 27), and check engine calculation responses (lines 41, 58, 74, 97).
- **`apps/web/src/app/analysis/load-data/bills/use-bill-workspace.ts`**:
  - Lines 31–38 define the `EditableBillRow` state representation:
    ```typescript
    export type EditableBillRow = {
      id: string;
      month: string;      // "YYYY-MM"
      energyKwh: string;
      totalCostThb: string;
      authority: "PEA" | "MEA";
      meterMode: "normal" | "tou";
    };
    ```
  - Lines 40–205 define `useBillWorkspace()`, which persists the bill list in `localStorage` under the key `thai-energy-planner-bills-workspace` as a serialized JSON string.
- **`apps/web/src/lib/local-bill-report.ts`**:
  - Lines 10–22 define `readLocalBillReportSnapshot()` which loads, normalizes, and filters stored workspace bills using `isUsableBill` (checking if month matches `YYYY-MM` and values are non-negative at lines 94-102), returning a `LocalBillReportSnapshot` containing aggregated metrics (`averageMonthlyCostThb`, `averageKwh`, etc.).
- **`packages/calculation-engine/src/thai-billing.ts`**:
  - Line 306 defines `estimateSolarFromMonthlyBill(input)` which takes a single `monthlyBillThb: number` and estimates monthly/annual kWh, capex, and ROI metrics.

---

## 2. Logic Chain
1. **User Input Processing & Mapping**:
   - The user inputs (like province, bill amount, property type) enter the web application and are validated at the API boundary via Zod schemas in `calculation-api.ts`.
   - Before executing the calculation engine, the API maps high-level inputs (like `province: "bangkok"`) to domain-specific types required by the engine (e.g., `authority: "MEA"`, `customerSegment: "residential"`) using the helpers `resolveTariffScope` and `inferThaiAuthorityFromProvince`.
   - The mapped values are passed to functions in the calculation engine (`estimateSolarFromMonthlyBill` or `runSolarAnalysis`).
2. **Monthly Bills Acceptance**:
   - At the API layer, only a single monthly bill value (`monthlyBillThb`) is accepted for screening estimates.
   - For multi-month input, the frontend utilizes `useBillWorkspace` to manage and store an array of monthly bill inputs in local storage.
   - The workspace bills are compiled locally into a report snapshot via `readLocalBillReportSnapshot()`. When initiating a scenario or solar run, pages load this local snapshot and pass the averaged or scaled values (like `monthlyKwh` or `systemSizeKwp`) to the API via query params.
3. **Padded 12-Month Array Support Proposal**:
   - By modifying `estimateRequestSchema` in `calculation-api.ts` to accept an optional `monthlyBills` array of `{ month: string, billThb: number }`, the backend can support multi-month submissions.
   - If the input length is $1 \le N < 12$, we can calculate the average bill cost. By referencing the earliest month, we generate the full 12-month timeline and pad missing months with the calculated average.
   - This filled 12-month array can be used to run more accurate monthly simulations in the backend or returned to the client to render complete yearly projections.

---

## 3. Caveats
- This investigation is read-only and does not implement the proposed changes to `calculation-api.ts`.
- It is assumed that months are in chronological order or can be sorted. If the provided months span across calendar years, the rolling 12-month array generation must handle year boundaries correctly (e.g., transitioning from `2025-12` to `2026-01`).
- The calculations in the core engine (`estimateSolarFromMonthlyBill`) currently only accept a single bill value. Adding multi-month support to the API may require executing the engine in a loop for each of the 12 months, or modifying the engine itself to accept arrays.

---

## 4. Conclusion
The system successfully validates screening parameters via Zod and maps them to the calculation engine inputs. Multi-month bills are supported locally via browser local storage and aggregated on the client side. Supporting fewer than 12 months of bills on the API layer is highly feasible by extending the schema, calculating their average, and padding the chronological sequence to a complete 12-month set.

---

## 5. Verification Method
- **Locate Files**: View `apps/web/src/lib/calculation-api.ts` and `apps/web/src/lib/calculation-api.test.ts`.
- **Run Tests**: Execute `npm run test` or `npx vitest run apps/web/src/lib/calculation-api.test.ts` to verify the test suite executes and passes.
- **Invalidation Condition**: If `monthlyBills` is passed but contains invalid formats (e.g., month names instead of `YYYY-MM`), the updated Zod schema must reject the payload with a 400 Bad Request response.
