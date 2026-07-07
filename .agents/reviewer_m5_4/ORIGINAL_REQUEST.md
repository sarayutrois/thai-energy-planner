## 2026-07-08T04:10:56Z
You are Reviewer 2. Your task is to verify the correctness, robustness, completeness, and compliance of the 5 bugfixes implemented for the Yearly Load Profiles and Monthly Averaging upgrade.
Your working directory is: c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\.agents\reviewer_m5_4\
Please initialize BRIEFING.md and progress.md in your working directory.

Tasks:
1. Inspect the code changes made in:
   - `packages/calculation-engine/src/solar-engine.ts`
   - `apps/web/src/lib/calculation-api.ts`
   - `apps/web/src/app/analysis/battery/` pages
2. Run `npm run build` and `npm run test` to confirm everything compiles and runs correctly.
3. Verify that the fixes completely solve the issues without introducing regressions, especially:
   - unscaled peak power scaling in engine
   - Month validation regex rejecting month numbers 00 and 13
   - Sub-year annualization scaling yearly outputs while keeping monthly outputs as raw unscaled averages
   - Legacy single monthlyScaleFactor multiplying with baseScaleFactors[i]
   - Next.js build prerender dynamic exports.
4. Report back with a clear verdict (PASS or VETO).
