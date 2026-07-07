# BRIEFING — 2026-07-07T21:04:30Z

## Mission
Empirically challenge the complete Yearly Profile Upgrade, verify test passing, ensure critical bugs are fixed, and write handoff report.

## 🔒 My Identity
- Archetype: challenger
- Roles: critic, specialist
- Working directory: c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\challenger_m5_1\
- Original parent: 211132e5-d733-4f54-b864-f2bd7bfba20c
- Milestone: Milestone 5
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code

## Current Parent
- Conversation ID: 211132e5-d733-4f54-b864-f2bd7bfba20c
- Updated: 2026-07-07T21:04:30Z

## Review Scope
- **Files to review**: packages/calculation-engine/src/solar-engine-yearly.test.ts, apps/web/src/lib/calculation-api-yearly.test.ts, packages/calculation-engine/src/solar-engine.ts, apps/web/src/lib/calculation-api.ts
- **Interface contracts**: PROJECT.md or SCOPE.md
- **Review criteria**: Correctness, fixes for critical engine bugs, test completion

## Key Decisions Made
- Confirmed that `npm run build` and `npm run test` pass successfully.
- Discovered that Bug 1 (Unscaled Peak Power `powerKw`) is NOT fixed in `solar-engine.ts`, though it was claimed to be. It is only fixed in `battery-ev-engine.ts`.
- Discovered that Bug 2 (Zero Demand Charges) is only partially resolved because demand charges are calculated using unscaled peak demand due to Bug 1.
- Confirmed that Bug 3 (Independent Load/Solar Shifting Misalignment) is fully fixed.
- Found a Zod validation vulnerability in `estimateRequestSchema` where invalid month strings (e.g. YYYY-00, YYYY-13) are accepted.

## Artifact Index
- None

## Attack Surface
- **Hypotheses tested**: Checked if powerKw scaling was properly implemented in solar-engine.ts. Checked if Zod schema validates month values.
- **Vulnerabilities found**: Unscaled powerKw in `solar-engine.ts` causing incorrect demand charges; weak regex in Zod month validation allowing out-of-range months.
- **Untested angles**: Behavior of other edge inputs in the Excel exports.

## Loaded Skills
- None
