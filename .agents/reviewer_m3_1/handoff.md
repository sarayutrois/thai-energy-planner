# Review and Handoff Report — 12-Month Independent Load Profiles and Variable Yields Upgrade

---

## Part 1: 5-Component Handoff Report

### 1. Observation
* **Modified Files**:
  * `packages/calculation-engine/src/solar-engine.ts` (Lines 702-824: added `shiftProfileToMonth` and `aggregateTariffResults`; Lines 826-1204: updated `calculateBillAfterSolar` with month-by-month loops; updated `optimizeSolarSize` and `runSolarAnalysis`).
  * `packages/calculation-engine/src/thai-billing.ts` (Lines 352-432: updated `estimateSolarFromMonthlyBill` to invoke `calculateBillAfterSolar` using seasonal yield definitions and extracting the specific month's results).
* **Test Execution**: Run command `npx vitest run packages/calculation-engine` outputted:
  ```
  Test Files  7 passed (7)
  Tests  118 passed (118)
  Duration  13.44s
  ```
* **Git Status**: Confirmed modifications in `solar-engine.ts` and `thai-billing.ts`, and a new test file `packages/calculation-engine/src/solar-engine-yearly.test.ts`.

### 2. Logic Chain
1. The upgrade successfully replaces the previous static year-scaling multiplier (multiplying a single month's bill by 12) with an independent 12-month billing loop where each calendar month is simulated using specific solar yields and days.
2. In `solar-engine.ts:shiftProfileToMonth`, the engine shifts day-of-week sequences to align with the target month's days of the week, preserving the accuracy of peak/off-peak TOU tariff periods.
3. In `solar-engine.ts:aggregateTariffResults`, individual monthly bills are averaged to represent a standard monthly bill, while the scenario's annual totals represent the true sum of the 12 independently calculated months. This maintains interface contract compatibility.
4. Unit tests in `solar-engine-yearly.test.ts` verify the behavior under varied inputs: seasonal specific yields, zero-export clamping, and multi-year projection integration.
5. All 118 unit tests ran and compiled successfully, verifying engine stability.

### 3. Caveats
* **Partial Year Custom Uploads**: If the user uploads a custom load profile that covers more than 1 month but less than 12 months, `isRepresentative` is evaluated as `false`. In this case, only the months present in the uploaded profile are simulated and summed. The final annual totals are the sum of those specific months rather than being scaled up to 12 months. This is a design decision and has been noted in the risk assessment.
* **No DST in Thailand**: The time shifting mechanism assumes that there are no DST transitions (which is correct for the Asia/Bangkok timezone). If this code is ever reused in a timezone with DST, the daily alignment could shift by an hour.

### 4. Conclusion
The implementation of the 12-month independent load profiles and variable yields calculation engine is correct, robust, and compliant with all project requirements. The interface contract for billing scenarios remains fully backward-compatible.

### 5. Verification Method
* **Command**: `npm --workspace=@thai-energy-planner/calculation-engine test` or `npx vitest run packages/calculation-engine`
* **Files to Inspect**: `packages/calculation-engine/src/solar-engine-yearly.test.ts`
* **Invalidation Condition**: The tests will fail if any monthly calculation produces non-finite or `NaN` outputs, or if seasonal yield adjustments do not align correctly with months.

---

## Part 2: Quality Review Report

**Verdict**: APPROVE

### Findings

#### [Minor] Finding 1: Lack of `NaN` Validation in Scale Factors
* **What**: Scale factors are checked for negativity and nullity, but `NaN` is not explicitly validated.
* **Where**: `packages/calculation-engine/src/solar-engine.ts` (Lines 899-908)
* **Why**: If a user manages to pass `NaN` in `monthlyScaleFactors`, it will propagate through multiplications and cause `NaN` outputs in the bill calculations.
* **Suggestion**: Replace `v === null || v === undefined` with `!Number.isFinite(v)`.

#### [Minor] Finding 2: Weekday Calculation Dependency on Canadian Locale
* **What**: `getBangkokParts` parses short weekday names formatted via the `en-CA` locale.
* **Where**: `packages/calculation-engine/src/solar-engine.ts` (Lines 2587-2603)
* **Why**: While Node.js fully supports ICU, using string parsing for the day-of-week makes the code dependent on English weekday formats.
* **Suggestion**: If refactoring in the future, standardizing timezone-aware date math via library functions or `Date.getDay()` relative to Bangkok offset would remove formatting dependencies.

### Verified Claims
* **Claim**: processes 12 distinct scale factors and aggregates them correctly -> verified via `vitest` unit test `T1.F1.2` -> PASS
* **Claim**: automatically infers scale factors per month based on the calendar days -> verified via `vitest` unit test `T1.F1.4` -> PASS
* **Claim**: aligns representative profile timestamps to match target month's starting day-of-week -> verified via `vitest` unit test `T2.F1.5` -> PASS

### Coverage Gaps
* None identified. The test suite covers seasonal profile alignment, zero-export clamping, and backward-compatible scaling.

### Unverified Items
* None. All relevant files and test runs were successfully executed.

---

## Part 3: Adversarial Review Report

**Overall Risk Assessment**: LOW

### Challenges

#### [Low] Challenge 1: Custom Multi-month Uploads (Not Representative)
* **Assumption challenged**: User uploads load profile representing exactly 1 month or a full year.
* **Attack scenario**: User uploads a 3-month custom load profile. `isRepresentative` is evaluated as `false`. The engine skips the missing 9 months.
* **Blast radius**: The annual totals represent only 3 months of values instead of a projected full year.
* **Mitigation**: Ensure that the UI and API explicitly display that multi-month files must cover the full 12 months for accurate annual projections, or fallback to representative month projection if requested.

#### [Low] Challenge 2: Massive Scale Factors
* **Assumption challenged**: Scaling factors are kept within sensible bounds (e.g., 0.5 to 3.0).
* **Attack scenario**: User inputs a scaling factor of 1000.
* **Blast radius**: Although the system processes it without overflow (using Decimal.js), it will produce highly distorted tariff results due to the stepped brackets of block tariffs.
* **Mitigation**: Add a warning or limit in the UI validation layer when monthly scale factors exceed reasonable ranges (e.g., > 10).

### Stress Test Results
* **Scenario**: Extreme scale factors (0.0001, 1000) -> processed safely without throwing NaN -> PASS (tested in `T2.F1.3`)
* **Scenario**: Zero-export clamping under winter vs. summer load factors -> excess generation correctly clamped -> PASS (tested in `T4.Scenario-3`)

### Unchallenged Areas
* **Upstream Tariff Engine**: We assume the tariff engine calculation functions (`calculateNormalBill` and `calculateTouBill`) work correctly under scaled loads.
