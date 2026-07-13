# Tariff Management

The Thai Energy Planner system manages complex electricity tariffs (MEA, PEA) across multiple customer segments and meter types (Normal, TOU).

## Versioning Philosophy

1. **Drafts:** New tariffs are created as `DRAFT`. They can be edited freely.
2. **Published:** Once verified, a tariff is marked as `PUBLISHED`. Published tariffs are **immutable**.
3. **Snapshots:** When an analysis is run, the engine creates a static JSON snapshot of the published tariff and saves it with the analysis. This ensures that past reports never change, even if new tariffs are published.

## The Tariff Engine

The `@thai-energy-planner/tariff-engine` package handles all tariff-related domain logic.

- `versioning.ts`: Validates overlaps in Ft periods, checks for negative rates, and manages the Draft -> Published lifecycle.
- `engine.ts`: Calculates monthly bills based on a given tariff snapshot and load intervals.
- `audit.test.ts`: Ensures that the system maintains an audit log for all critical tariff operations.

## Admin Controls

The `/admin` UI allows administrators to:

- Import and Export tariffs as JSON.
- Adjust Ft (Fuel Adjustment Charge) rates over time.
- Manage Holidays which affect TOU off-peak periods.
- View Audit Logs for traceability.
