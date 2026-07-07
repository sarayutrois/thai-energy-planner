## 2026-07-07T20:10:49Z
Task: Design the E2E and integration test suite for the Thai Energy Planner Yearly Profile Upgrade.
1. Create a `TEST_INFRA.md` file at the root of the project (`c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test\TEST_INFRA.md`) following the template in the instructions:
   - Feature inventory: 2 features:
     F1: 12-Month Independent Yearly Load Profile Calculation.
     F2: Automatic Monthly Averaging for Incomplete Bills.
   - Describe test architecture, formats, and directory layout.
   - List Tier 4 Real-World Application Scenarios (at least 5).
2. Design and write test cases.
   - Enumerate and document at least:
     - Tier 1: 5 * 2 = 10 feature coverage tests (happy paths).
     - Tier 2: 5 * 2 = 10 boundary and edge tests.
     - Tier 3: 2 cross-feature tests.
     - Tier 4: 5 real-world application scenarios.
   - Write these tests to a suitable place. Wait, since we are designing tests, you should locate the existing test suites (e.g. `packages/calculation-engine/src/solar-engine.test.ts` or `apps/web/src/lib/calculation-api.test.ts`). You can define these test templates/cases in `TEST_INFRA.md` or implement them directly. Since the implementation hasn't happened yet, these tests might fail if run now. You should prepare the test code (written to new test files or commented out/skipped so they can be run in later milestones). For example, write them as pending tests in `packages/calculation-engine/src/solar-engine.test.ts` or `apps/web/src/lib/calculation-api.test.ts` or as new test files that can be run later.
3. Make sure to run `npm run build` or existing tests to verify you didn't break existing compilations.
4. Mandatory Integrity Warning: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task.
5. Write your handoff.md detailing your design and list the exact test cases. Send a message to the orchestrator (conversation ID: 211132e5-d733-4f54-b864-f2bd7bfba20c) when done.
