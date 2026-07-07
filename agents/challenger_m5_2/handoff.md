# Challenge & Handoff Report: Yearly Profile Upgrade

## 1. Observation

- **API Zod Schemas Path**: `apps/web/src/lib/calculation-api.ts`
  - `estimateRequestSchema` (Lines 21–62) and `solarAnalyzeRequestSchema` (Lines 103–173) define month validations using regex `/^\d{4}-\d{2}$/`:
    ```typescript
    month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM")
    ```
- **Shared Types Path**: `packages/shared-types/src/index.ts` (Line 108) uses a stricter format check restricting months to `01–12`:
    ```typescript
    export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
    ```
- **Empirical Execution**:
  - We wrote a challenger test file `apps/web/src/lib/yearly-upgrade-challenger.test.ts` to stress test the schema and averaging logic.
  - Running `npm run test` produced the following log outputs:
    ```
    stdout | src/lib/yearly-upgrade-challenger.test.ts > Yearly Profile Upgrade Challenger - Empirical Verification > Zod Schema Vulnerability Challenge: Does it reject out-of-range month numbers like YYYY-13 or YYYY-00?
    CHALLENGE-ZOD: Month "2026-13" parsing success = true
    CHALLENGE-ZOD: processedMonths for "2026-13": [
      '2027-01', '2027-02',
      '2027-03', '2027-04',
      '2027-05', '2027-06',
      '2027-07', '2027-08',
      '2027-09', '2027-10',
      '2027-11', '2027-12'
    ]
    CHALLENGE-ZOD: Month "2026-00" parsing success = true
    CHALLENGE-ZOD: processedMonths for "2026-00": [
      '2026-00', '2026-01',
      '2026-02', '2026-03',
      '2026-04', '2026-05',
      '2026-06', '2026-07',
      '2026-08', '2026-09',
      '2026-10', '2026-11'
    ]
    ```

- **Build/Test Status**:
  - `npm run build` command: completed successfully.
  - `npm run test` command: executed successfully across all workspaces.
    ```
    Test Files  3 passed (3)
    Tests  29 passed (29)
    ```

---

## 2. Logic Chain

1. The API-level Zod schemas (`estimateRequestSchema` and `solarAnalyzeRequestSchema`) use `/^\d{4}-\d{2}$/` to validate month strings, only checking for two digits, instead of restricting values to `01–12`.
2. This regex allows payloads containing out-of-bounds months (e.g. `2026-13` and `2026-00`) to successfully bypass initial validation.
3. Once passed to the estimation engine, `processMonthlyBills` split-parses these months to generate a sequence of 12 months.
4. For month `13`, the calendar-year rollover math shifts the start to `2027-01` but fails to match the original input record `2026-13` key. This silently ignores the original month's input value during calculation and substitutes the average value instead.
5. For month `00`, the calendar math generates a sequence starting with invalid month name `2026-00`, causing invalid formatting and potential downstream trace issues.
6. Therefore, the Zod schemas at the API layer fail to enforce valid monthly sequences, leaking invalid months into the core calculation engine.

---

## 3. Caveats

- Out-of-bounds month sequences do not crash the engine under simple screening estimates because the calculations fallback to average-based padding. However, this silent failure leads to user input (such as specific bills for month `13`) being dropped and replaced by averages.
- There are no caveats regarding test framework availability; Vitest execution was confirmed.

---

## 4. Conclusion & Challenge Report

**Overall risk assessment**: **MEDIUM**

### [Medium] Challenge 1: Zod Month Range Validation Leak

- **Assumption challenged**: Zod schema at the API layer fully validates month sequence payloads.
- **Attack scenario**: A user uploads a month array containing `"2026-13"` or `"2026-00"`.
- **Blast radius**: The validation succeeds, but the month values are misaligned. Month `"2026-13"` is processed as starting in `"2027-01"` which fails index mapping, causing that month's real bill amount to be silently discarded and replaced by the average. Month `"2026-00"` propagates an invalid month name throughout the trace.
- **Mitigation**: Update `estimateRequestSchema` and `solarAnalyzeRequestSchema` in `apps/web/src/lib/calculation-api.ts` to use `MonthSchema` from `@thai-energy-planner/shared-types` or update the local regex to `/^\d{4}-(0[1-9]|1[0-2])$/`.

### Stress Test Results

- **1 Month Padding** (`[{ month: "2026-01", billThb: 3000 }]`) → Remaining 11 months are padded with average (3000), yielding `scaleFactors` of `1.0` → **PASS**
- **3 Month Padding** (`[{ month: "2026-01", billThb: 3000 }, { month: "2026-02", billThb: 3200 }, { month: "2026-03", billThb: 3400 }]`) → Average calculated as `3200`. Remaining 9 months are padded with average. `scaleFactors` correctly calculated relative to `3200` → **PASS**
- **6 Month Padding** (6 months provided) → Remaining 6 months padded with average. `scaleFactors` correctly calculated relative to average → **PASS**
- **12 Month Direct** (12 months provided) → Direct evaluation. No warnings are emitted → **PASS**
- **Zod Rejection: Empty / Duplicates / Bad Value Bounds** → Properly rejected by schema → **PASS**
- **Zod Rejection: Month number out of range (leak)** → Zod schema fails to reject `2026-13` and `2026-00` → **FAIL (Leak Identified)**

---

## 5. Verification Method

To verify the test execution and reproduce findings:
1. Run the test command from the root directory:
   ```bash
   npm run test
   ```
2. Inspect the test file `apps/web/src/lib/yearly-upgrade-challenger.test.ts`.
3. Check the console logs under `Zod Schema Vulnerability Challenge` to see the parsed outputs of `2026-13` and `2026-00`.
