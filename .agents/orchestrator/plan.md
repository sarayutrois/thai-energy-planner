# Plan

## Objective
Implement Yearly Load Profiles (12 months) and automatic monthly averaging for incomplete bills.

## Roadmap
1. **Explore**:
   - Inspect packages/calculation-engine/src/solar-engine.ts, thai-billing.ts, and solar-engine.test.ts to understand the input types, monthly scaling factors, and current billing calculations.
   - Inspect apps/web/src/lib/calculation-api.ts and apps/web/src/lib/calculation-api.test.ts to see how bills are processed and passed to the calculation engine.
2. **Design E2E Tests**:
   - Define opaque-box testing scenarios covering 12-month calculations and monthly averaging.
3. **Core Engine Upgrades**:
   - Update `SolarAnalysisInput` structure to support `monthlyScaleFactors` as a 12-element array.
   - Refactor `calculateBillAfterSolar` and any associated loop logic to calculate bill figures for each of the 12 months independently using the corresponding scaling factor, rather than scaling a single month by 12.
4. **API and Frontend Upgrades**:
   - Refactor calculation api to auto-calculate the average of provided months and fill in the missing months before forwarding to the engine.
5. **Verify and Audit**:
   - Run existing and new test suites.
   - Execute Challenger tests to verify behavior under varying profiles.
   - Audit with Forensic Auditor to guarantee zero cheating.
