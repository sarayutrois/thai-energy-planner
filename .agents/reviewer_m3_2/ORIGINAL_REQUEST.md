## 2026-07-08T03:24:57+07:00
You are a teamwork_preview_reviewer. Your working directory is `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\reviewer_m3_2\`.
Task: Review the calculation engine upgrades for 12-month independent load profiles and variable yields.
1. Inspect the changes made in `packages/calculation-engine/src/solar-engine.ts` and `packages/calculation-engine/src/thai-billing.ts`.
2. Assess structural design, code cleanliness, and backward compatibility handling (e.g., how single `monthlyScaleFactor` is handled).
3. Verify that all package unit tests compile and run by executing:
   - `npm run build:packages`
   - `npm --workspace=@thai-energy-planner/calculation-engine test`
4. Write your review report to `handoff.md` in your working directory. Send a message to the orchestrator (conversation ID: 211132e5-d733-4f54-b864-f2bd7bfba20c) when done.
