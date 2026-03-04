# QA Engineer Memory — Retirement Calculator

## Project Stack
- React 19 + Vite 7, client-side only, no backend
- Engine: `src/engine/calculator.js` (pure JS, also runs in Web Worker)
- State: persisted to localStorage via `src/hooks/useLocalStorage.js`
- Schema defaults: `src/defaultState.js` — new fields added here get merged into persisted state automatically via `{ ...DEFAULT_STATE, ...state }` in App.jsx
- Monte Carlo: `src/workers/monteCarlo.worker.js` (Web Worker, debounced 300ms)
- CSS: single file `src/App.css` — all component classes live here

## Known Fixed Bugs (session 2)
1. **SS taxability tier-2 formula** (`computeTaxableSS`): Tier-2 carryover must be `min(0.5*SS, 0.5*(upperThreshold-lowerThreshold))`, NOT `0.5*SS`. For MFJ this caps at $6,000 of carryover; for Single at $4,500. Using `0.5*SS` overstated taxable SS by up to that gap whenever SS income > the bandwidth and provisional income just barely exceeded the upper threshold.
2. **LTCG rate base income** (`totalIncomeForLtcg`): Must be `taxableIncome + ltcgGainAmount` (ordinary taxable income after std deduction, plus only the gain portion). The old code used `grossOrdinaryIncome + taxableDrawn + rothDrawn` which was wrong: gross not net, included tax-free Roth, and used the full withdrawal not just gains.

## Known Fixed Bugs (session 3 — 10-gap feature review)
3. **Pension income missing from bracket room** (both strategies): `approxOtherIncome` in bracket conversion and `maxPreTaxOrdinary` in bracket withdrawal both omitted `yearPensionIncome`, causing overstated bracket room when pension is active. Fixed by including `yearPensionIncome` in both calculations.
4. **ssStartAge backward compat**: `DEFAULT_STATE` includes `person1SsStartAge: 67`, so old states with `ssStartAge` (pre-split) got `person1SsStartAge=67` from the DEFAULT_STATE merge instead of the legacy value. Fixed in App.jsx `mergedState` with explicit migration: if `state.ssStartAge != null && state.person1SsStartAge == null`, use `ssStartAge` as the source.

## Key Engine Details
- `taxableIncome` in year snapshots = gross ordinary income minus standard deduction (already computed before LTCG)
- `ltcgGainAmount` accumulates gain amounts across all withdrawal blocks; the LTCG rate is applied once at the end after total income is known (prevents the 0%-rate bug where gains were silently discarded)
- RMD starts at age 73 (SECURE 2.0); table guard is `age < RMD_START_AGE` (73) — age 72 is in the table but blocked correctly
- Cash replenishment pre-tax path handles its own tax via gross-up; it does NOT feed back into the main federal tax block to avoid double-charging
- `realReturn` in `runMonteCarlo` IS used: `const r = realReturn / 100` feeds the lognormal mu. The memory note about it being "unused" was wrong.
- `pensionIncome` appears in year snapshots as `pensionIncome: yearPensionIncome` but is NOT displayed in YearTable (by design — not a bug)
- `person2Age` is a reference-only field used only in GlobalInputs for display; engine ignores it (all projections use person1Age timeline)
- SS survivor benefit check is tied to `person1SsActive` (not person2SsActive); after spouse death, survivor gets max(p1,p2) benefit only when person1 has started claiming
- `computeSummary` SS offset uses combined (p1+p2) monthly benefits — does not model spouse death; this affects the "on-track" estimate but not year-by-year projections

## CSS Architecture
- All new feature classes (`.radio-group`, `.segmented-control`, `.strategy-radio-group`, `.strategy-option*`, `.info-callout`, `.toggle-row*`, `.section-subheading`, `.section-divider`, `.sub-field`, `.conditional-block`, `.link-reset-deduction`, `.tax-detail-toggle`, `.col-tax-detail`) are present in `src/App.css` lines 735-789
- `.field-warning`, `.phase-warning`, `.roth-warning`, `.field-note`, `.section-note` are all present

## Schema Migration Pattern
- Simple new fields: add to `defaultState.js` only — auto-migrated by `{ ...DEFAULT_STATE, ...state }` in App.jsx
- Renamed/split fields: need explicit migration code in App.jsx `mergedState` block (see ssStartAge example)

## CSS Architecture
- All new feature classes (`.radio-group`, `.segmented-control`, `.strategy-radio-group`, `.strategy-option*`, `.info-callout`, `.toggle-row*`, `.section-subheading`, `.section-divider`, `.sub-field`, `.conditional-block`, `.link-reset-deduction`, `.tax-detail-toggle`, `.col-tax-detail`) are present in `src/App.css` lines 735-789
- `.field-warning`, `.phase-warning`, `.roth-warning`, `.field-note`, `.section-note` are all present

## Testing Gaps to Address
- No automated tests exist for the engine (pure JS — high ROI unit test target)
- SS taxability, LTCG rate selection, RMD enforcement, and bracket ceiling math are all untested
- The `computeSummary` function has no tests

## Architectural Patterns
- `configInvalid` guard in App.jsx blocks engine when ages are inconsistent; engine will not run when `deterministicYears = []`
- YearTable accumulation rows display `'—'` for all tax detail columns (values are 0, handled by `fmtCurrOrDash`/`fmtPct`)
- Inflation model (Task 1): `yearsElapsed = age - startAge`; `inflationFactor = (1 + inflationRate/100)^yearsElapsed`; factor = 1.0 in year 0; SS thresholds are hardcoded constants (IRS law, not inflated)
- Spouse death model (Task 2): `spouseDead = spouseDeathAge != null && age >= spouseDeathAge`; bracket override only fires when `filingStatus === 'mfj'` to avoid double application; `yearStandardDeduction` is hardcoded $15,000 * inflationFactor (not derived from user input) after death
- Healthcare costs are added to `annualSpend` AFTER the spouse death spending reduction — by design, healthcare doesn't drop when spouse dies
