# System Architecture

Thai Energy Planner follows a monorepo architecture managed by NPM Workspaces. The system is divided into a frontend web application and several domain-specific backend packages.

## Monorepo Structure

- `apps/web`: Next.js 15 App Router application handling UI, routing, API endpoints, and database interactions.
- `packages/shared-types`: Common TypeScript interfaces and enums shared across the stack.
- `packages/tariff-engine`: Domain logic for parsing, validating, and calculating electricity tariffs (TOU, Normal, Ft, Tax).
- `packages/calculation-engine`: Domain logic for simulating Solar PV, Battery Storage, EV charging, and comparing scenarios.
- `packages/report-engine`: Logic for exporting analysis results and tariff snapshots into JSON, CSV, and PDF formats.

## Database (Prisma)

The application uses PostgreSQL with Prisma ORM. The schema is defined in `prisma/schema.prisma`. 

Key entities include:
- **TariffPlan & TariffVersion:** Store structured electricity rates and version history.
- **LoadProfile & LoadInterval:** Store 15/30/60-minute interval energy data.
- **Solar/Battery/Ev Scenarios:** Store user assumptions and calculation results.

## Key Principles
1. **Separation of Concerns:** Business logic lives in `packages/`, UI lives in `apps/`.
2. **Immutability:** Published tariffs are immutable to ensure reproducible calculations.
3. **Reproducibility:** All scenarios store `assumptionsSnapshot` and `tariffSnapshot` so past calculations can be audited.
