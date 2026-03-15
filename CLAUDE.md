# CLAUDE.md — Retirement Calculator v2 Refactor

## What This Project Is

A retirement planning calculator being refactored from a single monolithic engine
(`src/engine/calculator.js`) into small, independently testable modules.

The React UI is NOT changing. The public API is NOT changing. Only the engine internals
are being reorganized.

## Project Structure

```
src/
  engine/
    modules/         ← NEW: individual math modules go here
    orchestrator.js  ← NEW: wires all modules together
    monte-carlo.js   ← NEW: extracted from calculator.js
    summary.js       ← NEW: extracted from calculator.js
    index.js         ← NEW: public API (same exports as current calculator.js)
    calculator.js    ← EXISTING: do not delete until index.js is complete
    calculator.test.js ← EXISTING: regression tests, must pass at the end
  defaultState.js    ← DO NOT TOUCH
  components/        ← DO NOT TOUCH
```

## The Refactor Rules

1. **One module per task.** Each Claude Code session works on exactly one module.
2. **Tests first.** Write the test file before the implementation. Tests define correctness.
3. **Do not modify `calculator.js`.** It stays intact until all modules are extracted and wired.
4. **Do not touch the UI.** No changes to `src/components/` or `src/App.jsx`.
5. **Do not touch `defaultState.js`.** The state shape is fixed.
6. **Commit after each module.** One commit = one module done, tests passing.

## Module Extraction Order

Work through these in order. Do not skip ahead.

### Tier 1 — Foundation (no dependencies on other modules)
1. `src/engine/modules/accounts.js` — spec: `docs/specs/accounts.spec.md`
2. `src/engine/modules/inflation.js` — spec: `docs/specs/inflation.spec.md`
3. `src/engine/modules/rmd.js` — spec: `docs/specs/rmd.spec.md`
4. `src/engine/modules/tax-federal.js` — spec: `docs/specs/tax-federal.spec.md`
5. `src/engine/modules/tax-state.js` — spec: `docs/specs/tax-state.spec.md`
6. `src/engine/modules/tax-ss.js` — spec: `docs/specs/tax-ss.spec.md`
7. `src/engine/modules/tax-ltcg.js` — spec: `docs/specs/tax-ltcg.spec.md`

### Tier 2 — Decision logic (may use Tier 1 modules)
7. `src/engine/modules/contributions.js` — spec: `docs/specs/contributions.spec.md`
8. `src/engine/modules/spending.js` — spec: `docs/specs/spending.spec.md`
9. `src/engine/modules/social-security.js` — spec: `docs/specs/social-security.spec.md`
10. `src/engine/modules/roth-conversion.js` — spec: `docs/specs/roth-conversion.spec.md`
11. `src/engine/modules/withdrawal.js` — spec: `docs/specs/withdrawal.spec.md`
12. `src/engine/modules/cash-replenishment.js` — spec: `docs/specs/cash-replenishment.spec.md`

### Tier 3 — Orchestration (wires everything together)
13. `src/engine/orchestrator.js`
14. `src/engine/monte-carlo.js`
15. `src/engine/summary.js`
16. `src/engine/index.js` — public API, then switch UI imports, then delete `calculator.js`

## How to Start a Module Task

1. Read the module's spec file in `docs/specs/`
2. Write the test file first (`*.test.js`)
3. Run tests — they should fail (red)
4. Write the implementation
5. Run tests — they should pass (green)
6. Run `npm test` to confirm no regressions in `calculator.test.js`
7. Commit with message: `feat: extract <module-name> module with tests`

## Definition of Done (per module)
- Module file exists at the correct path
- Test file exists alongside it
- All tests pass
- `npm test` (full suite) still passes
- No changes to any file outside the module and its test

## Definition of Done (full refactor)
- All 15 modules exist with passing tests
- `src/engine/index.js` exports `runDeterministic`, `runMonteCarlo`, `computeSummary`
- React app imports from `src/engine/index.js` (not `calculator.js`)
- `calculator.test.js` passes against the new orchestrator
- `calculator.js` is deleted

## Running Tests
```bash
npm test           # unit tests (vitest)
npm run test:e2e   # e2e tests (playwright) — run only after UI changes
```
