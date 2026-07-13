# E2E Test Suite Ready

## Test Runner

- Command: `npx vitest run packages/calculation-engine/src/solar-engine-yearly.test.ts apps/web/src/lib/calculation-api-yearly.test.ts`
- Expected: all tests pass with exit code 0 (currently skipped until implementation is complete)

## Coverage Summary

| Tier                      |  Count | Description                                                              |
| ------------------------- | -----: | ------------------------------------------------------------------------ |
| 1. Feature Coverage       |     10 | 5 tests for F1 (12-month Engine) and 5 tests for F2 (Auto-averaging API) |
| 2. Boundary & Corner      |     10 | 5 boundary/edge tests for F1 and 5 boundary/edge tests for F2            |
| 3. Cross-Feature          |      2 | Integration tests combining F1 and F2 API-to-Engine                      |
| 4. Real-World Application |      5 | Multi-tariff, seasonal, and zero-export application scenarios            |
| **Total**                 | **27** |                                                                          |

## Feature Checklist

| Feature                | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
| ---------------------- | :----: | :----: | :----: | :----: |
| F1: 12-Month Engine    |   5    |   5    |   ✓    |   ✓    |
| F2: Auto-averaging API |   5    |   5    |   ✓    |   ✓    |
