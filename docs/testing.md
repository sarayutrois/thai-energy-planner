# Testing Strategy

The Thai Energy Planner project uses a combination of static analysis, unit testing, and smoke testing to ensure high quality and prevent regressions.

## Static Analysis

- **Typecheck:** We use strict TypeScript across the monorepo.
  ```bash
  npm run typecheck
  ```
- **Linting:** ESLint is configured to prevent `any` types and unused variables, particularly in Next.js page routes.
  ```bash
  npm run lint
  ```

## Unit Testing

We use **Vitest** for fast and reliable unit testing of domain logic within the `packages/` directory.

```bash
npm run test
```

Key areas covered by unit tests:
- `tariff-engine`: Overlap validation, negative rate checks, reproducibility constraints, and audit logs.
- `calculation-engine`: TOU break-even logic, Solar payback calculations, and EV charging strategies.
- `report-engine`: CSV and JSON exporter validations.

## Smoke Testing (E2E)

Currently, we utilize a lightweight Node.js HTTP Smoke Test script (`scripts/smoke-test.js`) to verify that the Next.js production server boots up and critical routes return `200 OK`.

```bash
npm run smoke
```

*Note: In the future, a browser-based E2E testing framework like Playwright or Cypress should be introduced for comprehensive UI integration testing.*
