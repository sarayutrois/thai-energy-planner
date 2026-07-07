# BRIEFING — 2026-07-08T04:10:56+07:00

## Mission
Verify correctness of new calculation features and bugfixes through adversarial testing, boundary checks, and stress testing.

## 🔒 My Identity
- Archetype: Empirical Challenger
- Roles: critic, specialist
- Working directory: c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\challenger_m5_4\
- Original parent: 685a229a-4314-40b0-9ecb-38d62caf520d
- Milestone: Milestone 5
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code (only add/modify tests or verification scripts)

## Current Parent
- Conversation ID: 685a229a-4314-40b0-9ecb-38d62caf520d
- Updated: not yet

## Review Scope
- **Files to review**: `apps/web/src/lib/calculation-api.ts` (Zod schema validation), sub-year calculation annualization logic, and `scaleLoadIntervals`/`scaleGridImportIntervals`.
- **Interface contracts**: Verify correctness under invalid dates (YYYY-00, YYYY-13, and valid ranges), power scaling, annualization.
- **Review criteria**: Robustness against adversarial inputs, correctness of mathematical scaling.

## Attack Surface
- **Hypotheses tested**: TBD
- **Vulnerabilities found**: TBD
- **Untested angles**: TBD

## Loaded Skills
- None loaded.

## Artifact Index
- c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\challenger_m5_4\BRIEFING.md — Working briefing and constraints.
