# Orchestrator Handoff (Soft Handoff)

## Milestone State
| Milestone | Name | Status |
|---|---|---|
| M1 | Exploration | DONE |
| M2 | Test Suite Design | DONE |
| M3 | Calculation Engine Upgrade | DONE |
| M4 | API & Web Integration | IN_PROGRESS (Needs fixes) |
| M5 | Verification & Hardening | PLANNED (Needs re-run) |

## Active Subagents
- None (All 16 subagents from previous phases have completed or terminated).

## Pending Decisions
- None. The feedback from Challenger 1 and Reviewer 1 provides clear, actionable suggestions to resolve the five identified issues.

## Remaining Work for Successor
1. **Fix Engine Bug 1 (Unscaled Peak Power)**: Update `scaleLoadIntervals` and `scaleGridImportIntervals` in `packages/calculation-engine/src/solar-engine.ts` to multiply the `powerKw` fields by the `factor` (similar to battery-ev-engine).
2. **Fix API Zod Validation**: Tighten month validation regex in `apps/web/src/lib/calculation-api.ts` from `/^\d{4}-\d{2}$/` to `/^\d{4}-(0[1-9]|1[0-2])$/` to reject invalid months like `YYYY-00` and `YYYY-13`.
3. **Fix Sub-Year Annualization Bug**: In `packages/calculation-engine/src/solar-engine.ts`, if `isRepresentative` is false and `simulatedMonths.length < 12` (sub-year multi-month historical profile), annualize all yearly outputs (bills, savings, export revenue, generation, imports/exports) by multiplying by `12 / simulatedMonths.length`.
4. **Fix Next.js Prerender Failure**: Add `export const dynamic = 'force-dynamic'` to the top of `apps/web/src/app/analysis/battery/config/page.tsx` and any other battery page components failing during build.
5. **Fix Single Scale Factor base scale multiplier inconsistency**: In `packages/calculation-engine/src/solar-engine.ts`, ensure that single `monthlyScaleFactor` is multiplied by `baseScaleFactors` within the loop to be consistent with the array behaviour.
6. **Re-run Verification**: Spawn a fresh round of Reviewer, Challenger, and Auditor to ensure all build/test pipelines run cleanly and verified files are intact.

## Key Artifacts
- `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\PROJECT.md` — Project milestones and contracts
- `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\TEST_READY.md` — E2E test ready checklist
- `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\orchestrator\progress.md` — Progress tracker
- `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\orchestrator\BRIEFING.md` — Briefing/procedural memory
