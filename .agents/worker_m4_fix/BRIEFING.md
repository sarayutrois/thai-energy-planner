# BRIEFING — 2026-07-08T04:11:00+07:00

## Mission
Fix 5 specific bugs in the codebase related to the Yearly Load Profiles upgrade.

## 🔒 My Identity
- Archetype: Specialist Worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\worker_m4_fix\
- Original parent: 685a229a-4314-40b0-9ecb-38d62caf520d
- Milestone: Yearly Load Profiles Bugfixes

## 🔒 Key Constraints
- Follow minimal change principle.
- No dummy/facade implementations or hardcoded test results.
- Run `npm run build` and `npm run test` from workspace root to verify.

## Current Parent
- Conversation ID: 685a229a-4314-40b0-9ecb-38d62caf520d
- Updated: not yet

## Task Summary
- **What to build**: Fix 5 specific engine, API validation, sub-year annualization, Next.js prerender, and single scale factor bugs.
- **Success criteria**: All 5 bugs fixed according to specifications, project compiles (`npm run build`), all tests pass (`npm run test`).
- **Interface contracts**: None specified, check project files directly.
- **Code layout**: Packages and apps in workspace root.

## Change Tracker
- **Files modified**:
  - `packages/calculation-engine/src/solar-engine.ts` — Updated scaling methods, legacy scale factor multiplier, buildBillScenario signature and computations, sub-year annualization calculations.
  - `packages/calculation-engine/src/solar-engine.test.ts` — Updated test assertions to expect scaled values.
  - `apps/web/src/lib/calculation-api.ts` — Fixed API month validator regex.
  - `apps/web/src/app/analysis/battery/config/page.tsx` — Added force-dynamic directive.
  - `apps/web/src/app/analysis/battery/dispatch/page.tsx` — Added force-dynamic directive.
  - `apps/web/src/app/analysis/battery/page.tsx` — Added force-dynamic directive.
  - `apps/web/src/app/analysis/battery/results/page.tsx` — Added force-dynamic directive.
- **Build status**: Pass (`npm run build` compiled successfully)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (123/123 tests passed in calculation-engine; all other workspace package tests and web tests passed)
- **Lint status**: 0 violations (no new lint/typecheck errors introduced)
- **Tests added/modified**: Modified existing assertions in `solar-engine.test.ts` to adapt to correct base scale factor application.

## Loaded Skills
- None

## Key Decisions Made
- Updated test assertions in `solar-engine.test.ts` to expect correct scaled results, since applying the base scale factor to representative days changes the resulting monthly and annual totals.

## Artifact Index
- c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\worker_m4_fix\ORIGINAL_REQUEST.md — Original request details.
