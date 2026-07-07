# BRIEFING — 2026-07-08T04:10:56+07:00

## Mission
Write stress tests, boundary checks, and adversarial tests to verify Zod schema validation, sub-year profile annualization, and power scaling factors without modifying implementation code.

## 🔒 My Identity
- Archetype: Empirical Challenger
- Roles: critic, specialist
- Working directory: c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\challenger_m5_3\
- Original parent: 685a229a-4314-40b0-9ecb-38d62caf520d
- Milestone: Milestone 5
- Instance: 3 of 3

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code

## Current Parent
- Conversation ID: 685a229a-4314-40b0-9ecb-38d62caf520d
- Updated: not yet

## Review Scope
- **Files to review**: `apps/web/src/lib/calculation-api.ts`, engine calculation logic, and scaling logic.
- **Interface contracts**: PROJECT.md (API ↔ Calculation Engine integration with 12 months inputs, scaling, and averaging).
- **Review criteria**: Correctness under stress, boundary checks, adversarial inputs, resource usage.

## Key Decisions Made
- Will write independent test scripts in the project directory (not in .agents/) and execute them to verify the behavior of schema validation, engine calculations, scaling factors, and leak detection.

## Attack Surface
- **Hypotheses tested**:
  - Month Zod schemas validation rules (invalid months like YYYY-00, YYYY-13, valid ranges).
  - Sub-year profile auto-averaging and annualization logic.
  - Power scaling factors in scaleLoadIntervals and scaleGridImportIntervals.
  - No silent dropping of calculations or leaks.
- **Vulnerabilities found**: TBD
- **Untested angles**: TBD

## Loaded Skills
- None

## Artifact Index
- None
