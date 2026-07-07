# Project Context

## Target Repositories & Packages
- **Frontend / API**: `apps/web/`
  - `apps/web/src/lib/calculation-api.ts` (API/Frontend logic)
  - `apps/web/src/lib/calculation-api.test.ts` (API tests)
  - `apps/web/src/lib/solar-demo.ts` (Demo page using calculations)
- **Calculation Engine**: `packages/calculation-engine/`
  - `packages/calculation-engine/src/solar-engine.ts` (contains types and core math)
  - `packages/calculation-engine/src/solar-engine.test.ts` (engine tests)
  - `packages/calculation-engine/src/thai-billing.ts` (billing-related calculations)

## Known Types & Functions
- `SolarAnalysisInput` (needs to support `monthlyScaleFactors` as an array of 12 values instead of a single number, or check how scale factors are currently defined).
- `calculateBillAfterSolar` (needs to calculate 12 months independently using separate scale factors, rather than a simple 12x multiplier).

## Code-Only network mode constraints
- No external internet access.
- All code modifications and tests must be performed via delegated subagents (never by the orchestrator directly).
