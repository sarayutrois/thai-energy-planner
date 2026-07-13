# Calculation Engine

The `@thai-energy-planner/calculation-engine` package contains the core business logic for energy simulations. It is purely functional and has no dependencies on the database or UI.

## Engines

### 1. Scenario Engine (`scenario-engine.ts`)

Calculates baseline electricity bills based on Load Profiles and Tariffs. It handles:

- Normal vs TOU bill comparisons.
- Break-even calculations (determining the required off-peak shift).

### 2. Solar Engine (`solar-engine.ts`)

Simulates solar PV generation and financial returns.

- **Sizing:** Evaluates multiple kWp sizes to recommend the optimal ROI without oversizing.
- **Generation:** Calculates hourly generation based on system size, irradiance, and losses.
- **Financials:** Calculates Capex, NPV, IRR, and payback periods.

### 3. Battery Engine (`battery-ev-engine.ts`)

Simulates Battery Energy Storage Systems (BESS).

- **Dispatch Strategy:** Simulates charging from surplus solar and discharging during peak periods.
- **Constraints:** Respects charge/discharge power limits and usable capacity.

### 4. EV Engine (`battery-ev-engine.ts`)

Simulates Electric Vehicle (EV) charging behavior.

- **Scheduling:** Schedules charging during off-peak hours based on arrival/departure times.
- **Energy Requirements:** Calculates required kWh based on daily driving distance and vehicle efficiency.

## Design Patterns

All engines accept plain JS objects (assumptions, configs, intervals) and return structured result objects with `recommendations` and `trace` arrays for transparency.
