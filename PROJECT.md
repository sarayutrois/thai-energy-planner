# Project: Thai Energy Planner Yearly Profile Upgrade

## Architecture
- **packages/calculation-engine**: Contains core mathematical calculations for solar analysis.
  - Inputs: `SolarAnalysisInput` defines the input variables, including `monthlyScaleFactors` which should support 12 months.
  - Logic: `calculateBillAfterSolar` calculates the billing difference.
- **apps/web**: Contains web application and API endpoints.
  - API Library: `apps/web/src/lib/calculation-api.ts` processes requests, computes monthly averages for incomplete bills (less than 12 months), and forwards requests to the calculation engine.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|-------------|--------|
| 1 | Exploration | Trace and analyze calculation engine types and inputs, and API parsing code. | None | DONE |
| 2 | Test Suite Design | Establish test infra (`TEST_INFRA.md`) and write E2E/integration tests for 12 months and auto-averaging. | M1 | DONE |
| 3 | Calculation Engine Upgrade | Upgrade `SolarAnalysisInput` and core functions (`calculateBillAfterSolar`) to process 12 months separately. | M2 | DONE |
| 4 | API & Web Integration | Implement monthly billing default averaging and validation in `calculation-api.ts`. | M3 | IN_PROGRESS |
| 5 | Verification & Hardening | Execute all tests, run adversarial challenger checks, perform forensic audit. | M4 | PLANNED |

## Interface Contracts
### API ↔ Calculation Engine
- **Input Type**: `SolarAnalysisInput`
  - `monthlyScaleFactors`: `number[]` of length 12. If a single scale factor is provided, it should be mapped or rejected.
- **Bill Calculation**: `calculateBillAfterSolar`
  - Needs to process each month independently based on its respective scale factor, returning monthly breakdowns and a yearly aggregated total.
