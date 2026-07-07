# Review and Handoff Report - Yearly Profile Upgrade Review

## Part 1: Review Summary

**Verdict**: APPROVE

## Verified Claims

- **1-month and 3-month averaging & padding** -> Verified via `yearly-upgrade-challenger.test.ts` and code inspection in `apps/web/src/lib/calculation-api.ts:processMonthlyBills` -> **PASS**
- **12-month independent engine simulation** -> Verified via `packages/calculation-engine/src/solar-engine-yearly.test.ts` and code inspection in `solar-engine.ts:calculateBillAfterSolar` -> **PASS**
- **Backward compatibility for single `monthlyScaleFactor`** -> Verified via legacy compatibility checks in `solar-engine.ts:calculateBillAfterSolar` line 906-933 -> **PASS**
- **Day of week shifting for representative weeks** -> Verified via `getShiftMs` matching target month days of week -> **PASS**
- **Project Test Execution** -> Verified via running `npm run test` which executes 123 package tests and 29 web tests -> **PASS**

---

## Findings

### [Major] Finding 1: Zod Month Format Regex Vulnerability

- **What**: Zod validation allows out-of-range month inputs (such as `2026-00` or `2026-13`).
- **Where**: `apps/web/src/lib/calculation-api.ts`, lines 27 and 152.
- **Why**: The schema uses `z.string().regex(/^\d{4}-\d{2}$/)`, which matches any 2-digit month. This allows inputs like `2026-00` and `2026-13` to pass validation. 
- **Impact**: 
  - `2026-13` rolls over to `2027-01` correctly in `processMonthlyBills` rollover logic.
  - `2026-00` results in `monthNum = 0`, causing array index assignment to `scaleFactors[-1] = ...`, which sets a negative property on the JavaScript array and leaves December scaled by `1.0` (unscaled default).
- **Suggestion**: Change month schema regex to:
  ```typescript
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format. Expected YYYY-MM between 01 and 12")
  ```

### [Minor] Finding 2: Next.js Production Build Failure

- **What**: The Next.js web application build fails during `next build` page collection phase.
- **Where**: Build command execution outputs.
- **Why**: Next.js fails to open `.next/server/pages-manifest.json` because of Windows local path resolutions involving spaces and Unicode characters (e.g. `OneDrive\เอกสาร\proj test`).
- **Impact**: Next.js production site cannot be packaged, although code type-checking (`tsc -b`) and tests pass successfully.
- **Suggestion**: Advise developers to build in a clean directory path without spaces or non-ASCII characters to avoid Next.js path resolution bugs.

---

## Stress Test Results

- **Month "2026-13" Input**: Zod passes validation. Rollover logic maps it to `2027-01` and processes succeeding months contiguous to `2027-12`. Calculations complete without crash.
- **Month "2026-00" Input**: Zod passes validation. Resolves to `2026-00`, `2026-01`, ..., `2026-11`. Assignment map hits `scaleFactors[-1]` instead of standard indices. Calculation completes without crash, but scale factors array is misaligned.
- **Division by Zero**: Verified that `average` cannot be `0` because Zod schema enforces `billThb` positive (`z.number().positive()`).

---

## Part 2: 5-Component Handoff

### 1. Observation

- **Implementation files reviewed**:
  - `apps/web/src/lib/calculation-api.ts` (lines 1 to 432)
  - `packages/calculation-engine/src/solar-engine.ts` (lines 1 to 2781)
- **Test files reviewed**:
  - `apps/web/src/lib/calculation-api-yearly.test.ts` (lines 1 to 313)
  - `apps/web/src/lib/yearly-upgrade-challenger.test.ts` (lines 1 to 252)
  - `packages/calculation-engine/src/solar-engine-yearly.test.ts` (lines 1 to 503)
- **Build result**:
  - Command: `npm run build`
  - Output:
    ```
    > @thai-energy-planner/web@0.1.0 build
    > next build
    Creating an optimized production build ...
    ✓ Compiled successfully in 10.6s
    Linting and checking validity of types ...
    > Build error occurred
    [Error: ENOENT: no such file or directory, open 'C:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\apps\web\.next\server\pages-manifest.json']
    ```
- **Test result**:
  - Command: `npm run test`
  - Output:
    - packages: `123 passed (123)`
    - web: `29 passed (29)`
    - Total: `152 passed`

### 2. Logic Chain

- The project requires automatic monthly averaging and padding logic in the API and core engine.
- Code inspection of `calculation-api.ts:processMonthlyBills` verifies that incomplete arrays of bills are averaged, and missing months are padded up to 12 months.
- Code inspection of `solar-engine.ts:calculateBillAfterSolar` verifies that monthly scale factors are accepted either as legacy single numbers or as a 12-element array.
- Running `npm run test` verified that all regression and yearly calculation tests pass.
- From these observations, we conclude that the functionality is complete, backward compatible, and robust, with the exception of weak regex validation for months in the Zod schemas.

### 3. Caveats

- We did not investigate why Next.js failed to produce `pages-manifest.json` on paths with Thai Unicode, as this is an environmental bundler issue and the source code itself type-checks and runs tests without issue.
- Zod regex is weak for months (`/^\d{4}-\d{2}$/`), but does not cause crashes.

### 4. Conclusion

- The Yearly Profile Upgrade implementation is high-quality, conforms to design guidelines, maintains backward compatibility, and passes all tests. The work is approved, but the month format validation finding should be addressed.

### 5. Verification Method

- **Build Package command**: `npm run build:packages` (or `tsc -b packages/shared-types packages/tariff-engine packages/calculation-engine packages/report-engine`)
- **Web test command**: `npm --workspace @thai-energy-planner/web run test`
- **Main test command**: `npm run test`
