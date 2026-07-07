# Handoff Report — Yearly Profile Upgrade Review

This report provides the final review and adversarial challenge results for the Yearly Profile Upgrade including monthly averaging API logic and calculation engine bug fixes.

---

## 1. Observation

### Observation 1: Test Suite Results
Unit tests passed successfully when running `npm run test` (via task-54):
- **Calculation Engine Tests**: 123 tests passed.
  - `src/solar-engine-yearly.test.ts` passed.
  - `src/solar-engine.test.ts` passed.
  - `src/scenario-engine.test.ts` passed.
- **Web App Tests**: 29 tests passed.
  - `src/lib/yearly-upgrade-challenger.test.ts` (10 tests) passed.
  - `src/lib/calculation-api-yearly.test.ts` (13 tests) passed.

### Observation 2: Zod Month Range Validation Gap
Stdout from `yearly-upgrade-challenger.test.ts` during test run:
```
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
In `apps/web/src/lib/calculation-api.ts` lines 27 and 152:
```typescript
month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM")
```

And in `runEstimateApiCalculation` in `apps/web/src/lib/calculation-api.ts` lines 234-237:
```typescript
  const scaleFactors = Array(12).fill(1.0);
  for (const bill of filledBills) {
    const monthNum = Number(bill.month.split("-")[1]);
    scaleFactors[monthNum - 1] = bill.billThb / (average || 1);
  }
```

### Observation 3: Multi-Month Sub-Year Profile Billing Error
In `packages/calculation-engine/src/solar-engine.ts` lines 876-879:
```typescript
  const uniqueMonths = new Set(
    loadIntervals.map((i) => getBangkokParts(i.timestamp).date.slice(0, 7)),
  );
  const isRepresentative = uniqueMonths.size === 1;
```
If `isRepresentative` is false, lines 968-974 filter by month:
```typescript
    } else {
      const mStr = String(m).padStart(2, "0");
      monthlyLoad = loadIntervals.filter((i) => getBangkokParts(i.timestamp).date.slice(5, 7) === mStr);
      monthlySolar = input.solarIntervals.filter((i) => getBangkokParts(i.timestamp).date.slice(5, 7) === mStr);

      if (monthlyLoad.length === 0) continue;
    }
```
And `simulatedMonths` only contains months with data. The skipped months do not add to `annualBill` or `annualExportRevenue` in `buildBillScenario` lines 2161-2169:
```typescript
  const annualBill = input.monthlyBills.reduce((sum, b) => sum.plus(b.grandTotal), zero);
  const annualExportRevenue = input.usesSolar
    ? input.monthlyExportRevenues.reduce((sum, r) => sum.plus(r), zero)
    : zero;
```

### Observation 4: Next.js Static Prerendering Failure
Error output during `npm run build` (via task-23):
```
Error occurred prerendering page "/analysis/battery/config". Read more: https://nextjs.org/docs/messages/prerender-error
[Error: ENOENT: no such file or directory, open 'C:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\apps\web\.next\server\app-paths-manifest.json'] {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'open',
  path: 'C:\\Users\\Sarayut Mounguming\\OneDrive\\เอกสาร\\proj test\\apps\\web\\.next\\server\\app-paths-manifest.json'
}
Export encountered an error on /analysis/battery/config/page: /analysis/battery/config, exiting the build.
 ⨯ Next.js build worker exited with code: 1 and signal: null
```

### Observation 5: Inconsistent `monthlyScaleFactor` Handling
In `packages/calculation-engine/src/solar-engine.ts` lines 920-927:
```typescript
  } else if (input.monthlyScaleFactor !== undefined) {
    if (input.monthlyScaleFactor < 0) {
      throw new Error("Scale factors cannot be negative");
    }
    for (let i = 0; i < 12; i++) {
      growthFactors.push(input.monthlyScaleFactor);
      monthlyScaleFactors.push(input.monthlyScaleFactor);
    }
```
If `monthlyScaleFactor` is specified, it populates `monthlyScaleFactors` directly with the growth factor, bypassing the `baseScaleFactors` multiplier, which differs from how `monthlyScaleFactors` (plural) is handled.

---

## 2. Logic Chain

1. **Zod Validation Weakness**: From **Observation 2**, we see that Zod schema accepts month strings like `2026-13` and `2026-00`.
   - For `2026-00`, `monthNum` becomes `0`.
   - When mapping scale factors: `scaleFactors[monthNum - 1] = ...` evaluates to `scaleFactors[-1] = ...`.
   - This writes to a non-index property of the array. The actual array indices `0..11` do not receive the scale factor, leaving the corresponding month with a default `1.0` scale factor. This results in incorrect scaling.
   - For `2026-13`, the arithmetic in `processMonthlyBills` wraps the sequence to start in `2027-01`, but could cause index alignment issues.
   - **Conclusion**: Zod month regex must be tightened to `/^\d{4}-(0[1-9]|1[0-2])$/` to reject invalid months.

2. **Sub-Year Financial Underestimation**: From **Observation 3**, when a user uploads a load profile covering more than 1 month but less than 12 months (e.g., 3 months), `isRepresentative` is `false`.
   - The loop skips all months that do not have data.
   - `buildBillScenario` sums up the bills from only the simulated months (e.g. 3 months) to calculate `annualBillThb`.
   - This 3-month total is returned as the "annual" bill, and the savings of these 3 months are treated as the "annual" savings in the financial engine.
   - Consequently, the ROI, NPV, and payback periods are calculated based on 3 months of savings instead of 12 months, underestimating annual savings and inflating the payback period by a factor of 4x.
   - **Conclusion**: If the uploaded profile spans less than 12 months, the engine must either treat it as representative (scaling it up to 12 months) or the calculated sum must be annualized (multiplied by `12 / simulatedMonths.length`) before being passed to financial calculations.

3. **Next.js Prerendering Failure**: From **Observation 4**, Next.js build failed because it tried to statically prerender `/analysis/battery/config` which depends on dynamic `searchParams` and context.
   - In Next.js 15, dynamic components that read dynamic properties like `searchParams` must be marked with `export const dynamic = 'force-dynamic'` or rendered under Suspense.
   - **Conclusion**: Adding `export const dynamic = 'force-dynamic'` to the top of `apps/web/src/app/analysis/battery/config/page.tsx` and related pages will resolve the prerendering failure.

4. **Scale Factor Inconsistency**: From **Observation 5**, passing a single `monthlyScaleFactor` overrides calendar-day scaling entirely, whereas passing `monthlyScaleFactors` array multiplies by `baseScaleFactors`. This will cause representative profiles to not scale to the month length if `monthlyScaleFactor` is used.
   - **Conclusion**: The single `monthlyScaleFactor` should be multiplied by `baseScaleFactors` inside the loop, consistent with the array behavior.

---

## 3. Caveats

- We did not test real-time database queries or authentication since they are out of the scope of this pure calculation engine and static build verification.
- We assumed the user workspace environment has the standard Node.js v20 dependencies installed, which is verified by successful Vitest run.

---

## 4. Conclusion

**Verdict**: REQUEST_CHANGES

The Yearly Profile Upgrade features core mathematical correctness in tests, but contains **three critical/major issues** that must be resolved before production:
1. **Critical Zod Validation Bug**: Month regex allows `YYYY-00` and `YYYY-13`, causing invalid array index mappings (`scaleFactors[-1]`).
2. **Major Financial Logic Bug**: Sub-year historical profiles (e.g. 3 months) are treated as representative = false, resulting in raw 3-month savings being treated as 12-month annual savings.
3. **Major Build Defect**: Next.js static prerendering crashes on Battery Config pages due to dynamic searchParams access.

---

## 5. Verification Method

- Run unit tests: `npm run test` (verifies package tests and API-layer unit tests).
- Run project build: `npm run build` (verifies Next.js compilation and checks for prerendering errors).
- Inspect the output of the newly added Zod month range tests in `yearly-upgrade-challenger.test.ts` to ensure invalid months are correctly rejected.

---

## 6. Quality Review Report

### Review Summary
- **Verdict**: REQUEST_CHANGES
- **Quality Conformance**: Excellent modular separation and math logic in engines, but lacks boundary input validations and Next.js page metadata robustness.

### Findings

#### [Critical] Finding 1: Zod Month Range Vulnerability
- **What**: Month regex accepts `00` and `13`.
- **Where**: `apps/web/src/lib/calculation-api.ts` lines 27 and 152.
- **Why**: Triggers array index `-1` assignment in scale factors and sequence wrapping.
- **Suggestion**: Change regex to `/^\d{4}-(0[1-9]|1[0-2])$/`.

#### [Major] Finding 2: Sub-Year Profile Annualization Bug
- **What**: Multi-month profiles shorter than 12 months do not scale annual savings.
- **Where**: `packages/calculation-engine/src/solar-engine.ts` lines 876-879 and 2161-2169.
- **Why**: Financial engine calculates payback and NPV using partial-year sum instead of true annualized savings.
- **Suggestion**: Annualize the savings by multiplying by `12 / simulatedMonths.length` if the profile is incomplete and `isRepresentative` is false.

#### [Major] Finding 3: Next.js Static Prerender Error
- **What**: Next.js App Router prerender crash.
- **Where**: `apps/web/src/app/analysis/battery/config/page.tsx` (and other battery pages).
- **Why**: Accesses `searchParams` during static generation.
- **Suggestion**: Export `dynamic = 'force-dynamic'` from the page components.

---

## 7. Adversarial Challenge Report

### Challenge Summary
- **Overall risk assessment**: HIGH

### Challenges

#### [High] Challenge 1: Invalid Month Injection
- **Assumption challenged**: User input YYYY-MM is always a valid calendar month.
- **Attack scenario**: Inject `2026-00` monthly bill.
- **Blast radius**: Scale factors array sets `-1` key. Missing index `0` retains `1.0` default scale factor. Billing calculation produces incorrect results.
- **Mitigation**: Tighten Zod regex constraint.

#### [Medium] Challenge 2: Payback Period Inflation for Short Profiles
- **Assumption challenged**: `isRepresentative = false` profiles always span exactly 12 months.
- **Attack scenario**: User uploads a 3-month profile (Jan, Feb, Mar).
- **Blast radius**: The engine treats the 3-month sum as annual. Payback period is inflated by 4x.
- **Mitigation**: Auto-scale/annualize or warn the user and default to representative mode.
