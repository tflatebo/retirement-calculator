# Progress log
(append-only; latest at bottom)

## 2026-03-04

### Step 1: Verify dev server starts
- Ran `npm run dev` with a 10s timeout
- Output: Vite v7.3.1 ready in 391ms at http://localhost:5173/
- No errors; dev server starts successfully

### Step 2: Update README.md
- Replaced boilerplate Vite template content with project-specific docs
- Added: required Node version (v22+), npm version (v10+)
- Added: dev workflow commands
- Added: devcontainer notes (`.devcontainer/` config, port 5173 auto-exposed)
- Added: link to CLAUDE.md for architecture details

### Next
- Done — stop condition met

## 2026-03-06

### Step 3: Fix all lint errors (14 errors → 0)
- `calculator.js`: removed dead functions (`calcFederalTax`, `getBracketCeiling`, `getLtcgRate`) superseded by `*WithBrackets`/`*FromBrackets` variants; removed unused `realReturn` destructure and two `preGrowthCash` assignments
- `ContributionPhases.jsx`: removed unused `formatCurrency` import
- `useLocalStorage.js`: replaced `catch (e)` with `catch {}` (optional catch binding)
- `e2e/debugDrag.spec.js`: removed unused `expect` import
- `e2e/yearTable.spec.js`: prefixed unused `detTotal`/`medTotal` vars with `_`
- `playwright.config.js`: added `/* global process */` for Node global
- `App.jsx`: replaced synchronous `setMcData([])`/`setMcPending(false)` in effect with derived `effectiveMcData`/`effectiveMcPending` (useMemo); removed stale eslint-disable comment
- All 16 unit tests pass
