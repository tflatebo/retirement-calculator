# Retirement Calculator

A single-page React app for retirement planning simulations. No backend, no auth — all state persists to `localStorage`.

## Requirements

- **Node.js**: v22+ (tested on v22.22.0)
- **npm**: v10+

## Dev workflow

```bash
cd retirement-calculator
npm install          # install dependencies (already done in devcontainer)
npm run dev          # start dev server at http://localhost:5173 with HMR
npm run build        # production build to dist/
npm run lint         # ESLint
npm run test         # Vitest unit tests (run once)
npm run test:e2e     # Playwright E2E tests
```

## Devcontainer

This repo includes a `.devcontainer/` configuration. Opening in VS Code Dev Containers or GitHub Codespaces will automatically set up the environment with Node 22, install dependencies, and expose port 5173.

No additional setup is needed inside the devcontainer — just run `npm run dev` from `retirement-calculator/`.

## Architecture

Single-page React app — no backend, no auth. All state persists to `localStorage` under key `retirementCalcState`.

**Key modules:**
- `src/engine/calculator.js` — all financial math (simulation, Monte Carlo, tax, RMDs, withdrawals). No React dependencies; fully unit-testable.
- `src/defaultState.js` — canonical schema for all inputs. Adding a new field requires updating this file.
- `src/context/StateContext.js` — React context providing `{ state, updateField, updateFields }` to all components.
- `src/App.jsx` — orchestrates state, runs deterministic calc synchronously, sends MC to a Web Worker (debounced 300ms).
- `src/utils/format.js` — currency and percentage formatting helpers.
- `src/utils/ranges.js` — consecutive-integer range grouping/formatting (used for contribution phase labels).
- `src/workers/monteCarlo.worker.js` — Web Worker that runs 1000 Monte Carlo simulations off the main thread.

See [CLAUDE.md](../CLAUDE.md) for full data-flow diagram and component conventions.

## Testing

```bash
npm test          # unit tests (Vitest)
npm run test:e2e  # E2E tests (Playwright)
```

**Unit test coverage** (`src/**/*.test.js`):
- `engine/calculator.test.js` — integration tests for `runDeterministic`, `runMonteCarlo`, `computeSummary`; feature tests for SS, spouse death, inflation, RMDs, withdrawal strategies, Roth conversion, healthcare, pension, federal/state tax, stocks/bonds allocation, per-account ledger accounting
- `utils/format.test.js` — `formatCurrency` and `formatPercent` edge cases
- `utils/ranges.test.js` — `groupConsecutive` and `formatRanges` correctness

**E2E test coverage** (`e2e/**/*.spec.js`, Playwright):
- `yearTable.spec.js` — Year-over-Year detail table: sticky header, deterministic totals, median toggle, tooltip visibility, tooltip ending balance matches cell display in both deterministic and median modes
- `chartDrag.spec.js` — Interactive chart drag handles: retirement age handle, spending phase boundaries, clamping behavior

**Testing philosophy:**
- Engine logic is separated from UI and tested independently (no React in unit tests)
- Prefer deterministic integration tests over snapshot tests
- Each feature has at least one test exercising its behavior end-to-end through the simulation engine
- Account balances are verified non-negative across all runs to catch numerical errors
- E2E tests cover UI interactions and verify that display values are consistent (e.g., tooltip ending balance always matches the cell's selected mode)
