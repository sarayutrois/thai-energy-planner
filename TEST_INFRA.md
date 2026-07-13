# Test Infrastructure and Strategy: Thai Energy Planner Yearly Profile Upgrade

This document outlines the end-to-end (E2E) and integration test suite design for the **Yearly Profile Upgrade** of the Thai Energy Planner.

---

## 1. Feature Inventory

### Feature 1 (F1): 12-Month Independent Yearly Load Profile Calculation

- **Scope**: Upgrade the core `@thai-energy-planner/calculation-engine` to support independent, month-by-month energy scaling and bill calculations instead of extrapolating a single representative month's bill by multiplying by 12.
- **Key Inputs**:
  - `monthlyScaleFactors`: A 12-element number array (`number[]`) representing scaling factors for January through December.
  - Backward compatibility support for `monthlyScaleFactor` (single number) which gets mapped to a 12-element array: `Array(12).fill(monthlyScaleFactor)`.
- **Calculation Logic**:
  - Process each of the 12 months independently, applying the month-specific scaling factor and monthly solar yield factor.
  - Correctly handle weekday/weekend alignment when shifting representative load profiles to different target months (retaining correct TOU pricing distributions).
  - Aggregate (sum) the 12 months to compute annual bills, savings, and export revenues.

### Feature 2 (F2): Automatic Monthly Averaging for Incomplete Bills

- **Scope**: Upgrade the `@thai-energy-planner/web` API layer (`calculation-api.ts`) to validate multi-month bill lists, compute the average bill for incomplete histories (< 12 months), pad missing months, and forward the request to the calculation engine.
- **Key Inputs**:
  - `monthlyBills`: An array of objects `Array<{ month: string, billThb: number }>` where `1 <= length < 12` is considered an incomplete bill history.
- **Processing Logic**:
  - Sort input bills chronologically.
  - Compute the average cost/energy from the provided months.
  - Fill/pad the missing months of the 12-month rolling period using the calculated average.
  - Validate that the array contains valid months (`YYYY-MM`), no duplicates, and valid positive bill amounts.

---

## 2. Test Architecture, Formats, and Directory Layout

### Test Architecture

- **Unit & Core Integration Testing**: Implemented via **Vitest** in the `packages/calculation-engine` workspace to test the mathematical formulas, scale factor inputs, and monthly aggregation logic.
- **API Boundary & Schema Validation Testing**: Implemented via **Vitest** in the `apps/web` workspace to test Zod validation schemas, API input parsing, monthly averaging, and padding logic.
- **E2E / System Testing**: Simulated using end-to-end integration tests that flow from API request down to engine calculations.

### Test Directory Layout

- Core calculation engine tests are co-located in the `packages/calculation-engine/src/` folder.
- Web API/schema tests are located in `apps/web/src/lib/`.
- Design/Mock tests for this upgrade are stored in:
  1. `packages/calculation-engine/src/solar-engine-yearly.test.ts` (Core engine F1 tests)
  2. `apps/web/src/lib/calculation-api-yearly.test.ts` (API/validation F2 tests)

---

## 3. Test Tiers and Case Directory

### Tier 1: Feature Coverage (Happy Paths)

This tier ensures basic functionality is operational under expected conditions.

| Test ID     | Title                                | Target | Input Parameters                                                        | Expected Behavior                                                                                       |
| ----------- | ------------------------------------ | ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **T1.F1.1** | Identical scale factors array        | F1     | Array of 12 identical values (e.g. `[1.2, ..., 1.2]`)                   | The engine calculates identical monthly bills and matches single-factor behavior scaled by 12.          |
| **T1.F1.2** | Distinct monthly scale factors       | F1     | Array of 12 distinct scale factors representing seasonal load variation | The engine scales each month independently and outputs the correct aggregated annual sum.               |
| **T1.F1.3** | Backward compatibility mapping       | F1     | Single `monthlyScaleFactor: 1.1`                                        | The engine automatically maps this to `Array(12).fill(1.1)` and executes successfully.                  |
| **T1.F1.4** | Inferred scale factors per month     | F1     | Omitted scale factors, 7-day representative load                        | The engine infers month-specific scaling factors based on actual days in each calendar month.           |
| **T1.F1.5** | Monthly result breakdown output      | F1     | Valid 12-month input                                                    | Results contain a month-by-month list of energy, bill cost, import, and solar export.                   |
| **T1.F2.1** | Full 12-month bills list             | F2     | Array of 12 chronological bills                                         | API passes them directly to the calculation engine without averaging or padding.                        |
| **T1.F2.2** | Incomplete bills averaging & padding | F2     | 3 consecutive bills (e.g. Jan, Feb, Mar)                                | API calculates average of the 3 bills, pads the remaining 9 months with it, and forwards to the engine. |
| **T1.F2.3** | Single-month bill padding            | F2     | Single bill in `monthlyBills`                                           | API pads the remaining 11 months with this single bill value.                                           |
| **T1.F2.4** | chronological sorting of bills       | F2     | Bills provided out of order                                             | API correctly sorts them chronologically before processing.                                             |
| **T1.F2.5** | Leap year handling in sequence       | F2     | Billing period covering Feb 2028                                        | API correctly determines 29 days for Feb 2028 and performs proper averaging.                            |

---

### Tier 2: Boundary and Edge Cases

This tier verifies system robustness against malformed or unusual inputs.

| Test ID     | Title                                 | Target | Input Parameters                                                      | Expected Behavior                                                                |
| ----------- | ------------------------------------- | ------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **T2.F1.1** | Scale factors array length != 12      | F1     | `monthlyScaleFactors` of length 11 or 13                              | Throws a validation error.                                                       |
| **T2.F1.2** | Negative scaling factors              | F1     | `monthlyScaleFactors` containing negative value                       | Throws a validation error.                                                       |
| **T2.F1.3** | Extreme scaling factors               | F1     | Scale factors of `0.001` or `1000`                                    | The engine processes them safely without numerical overflow or division-by-zero. |
| **T2.F1.4** | Gaps in scale factors array           | F1     | `undefined` or `null` inside array                                    | Rejects payload during validation.                                               |
| **T2.F1.5** | Weekday/Weekend shift logic alignment | F1     | Start date of representative profile doesn't match target month start | Engine shifts dates to align weekdays/weekends preserving TOU distribution.      |
| **T2.F2.1** | Empty bills list                      | F2     | Empty `monthlyBills` array                                            | API rejects payload with Zod validation error.                                   |
| **T2.F2.2** | Duplicate months in bills list        | F2     | Two entries for same month `"2026-03"`                                | API rejects payload with validation error.                                       |
| **T2.F2.3** | Gaps in monthly bill sequence         | F2     | Gaps in bills (Jan and Mar present, Feb missing)                      | API pads the missing Feb month with the average of Jan and Mar.                  |
| **T2.F2.4** | Reverse ordered months                | F2     | Array ordered newest to oldest                                        | API sorts them chronologically and processes correctly.                          |
| **T2.F2.5** | Out of bounds bill value              | F2     | Bill values <= 0 or > 1,000,000                                       | API rejects the payload with Zod validation error.                               |

---

### Tier 3: Cross-Feature Integration Tests

This tier ensures F1 and F2 integrate correctly together.

- **T3.1: End-to-End API-to-Engine Incomplete Bills Integration**:
  Pass an incomplete list of 4 bills to the API. Verify that the API calculates the average, pads it to 12 months, maps it to a 12-element `monthlyScaleFactors` array, and the core calculation engine executes using this array, producing a valid annual savings breakdown.
- **T3.2: Seasonal Solar Yield Alignment with Scaled Monthly Bills**:
  Verify that when month-specific scale factors are applied, the solar engine aligns the scaled load interval of each month with that specific month's solar yield factor. For example, March (high yield, high load) and August (low yield, low load) are evaluated independently, resulting in accurate self-consumption and payback figures.

---

## 4. Tier 4: Real-World Application Scenarios

### Scenario 1: Residential Summer vs. Monsoon Seasonal Variation

- **Setup**: A residential household in Bangkok. Summer months (Mar–May) have high cooling loads (A/C load, scale factors > 1.3), while Monsoon months (Jul–Sep) have low consumption (scale factors < 0.85) and low solar yields due to cloud cover.
- **Verify**: The simulation independently scales loads and matches them to monthly solar yield snapshots, outputting realistic lower self-consumption in Monsoon and higher payback rates in Summer.

### Scenario 2: Small Business TOU with Missing Historical Records

- **Setup**: A small restaurant owner on a TOU tariff has only 4 months of billing data.
- **Verify**: The API averages these 4 months, pads the remaining 8 months, and the engine evaluates the TOU peak/off-peak distributions per month. The integration proves the business breaks even on solar investment without overestimating winter savings.

### Scenario 3: Industrial User Transition with Zero-Export Policy

- **Setup**: A factory with 12 months of highly volatile monthly scale factors under PEA medium voltage TOU tariff. The customer enables a Zero-Export policy.
- **Verify**: The engine enforces the zero-export clamp independently for each month. In months with high load scale factors, zero export has minimal impact. In months with low load scale factors, the surplus solar is clamped, reducing the monthly and annual payback rate.

### Scenario 4: MEA vs. PEA Regional Boundary Adjustments

- **Setup**: Two identical households, one in Bangkok (MEA) and one in Chonburi (PEA), submitting identical 12-month billing factors.
- **Verify**: The system resolves MEA and PEA tariffs respectively, performs independent monthly calculations, and outputs correct tariff-specific pricing and annual savings.

### Scenario 5: Multi-Year Project Lifetime Projection with Degradation

- **Setup**: A 10-year project lifetime analysis using a 12-month independent load profile and yearly solar degradation (0.5% per year).
- **Verify**: Year 1 calculations are the sum of the 12 scaled monthly bills. Year 2 to Year 10 calculations decrement the solar yield month-by-month and recalculate NPV, IRR, and payback period accurately.
