# Progress

## Session 1 — Ledger accounting fixes

### Completed steps

**1. Identified root causes of ledger math discrepancies**

Three distinct bugs found:
- **MC median vs deterministic mismatch**: `endingBalance={displayX}` used MC p50 median while all tooltip rows (flows) came from deterministic simulation. Irreconcilable gap in Median mode.
- **LTCG double-counting in taxable tooltip**: `ltcgTax` shown as separate outflow, but already embedded in `taxPaidFromTaxable` (which pays the full `totalTax` including LTCG). Double-counted only when LTCG > 0.
- **Forced RMD not tracked for cash tooltip**: When SS income covers spending and RMD exceeds normal withdrawals, forced RMD gross proceeds were deposited to cash but not tracked for tooltip display.

**2. Wrote failing tests (TDD)**

Added `per-account ledger accounting` describe block in `calculator.test.js`:
- `preTax ledger balances` — verifies opening + growth + contrib - drawn = ending
- `cash ledger balances: opening + all flows (including forced RMD proceeds) = ending`
- `forced RMD is tracked in rmdForcedCashIn when spending does not cover RMD`
- `cashRefillFromPreTaxGross is tracked separately when source is preTax`
- `stocks/bonds blended return is used when allocation < 100%`

**3. Fixed `calculator.js`**

- Added `rmdForcedCashIn` tracking variable — set to `actualForced` when RMD shortfall is forced
- Added `cashRefillFromPreTaxGross` tracking — captures gross preTax drawn for cash refill
- Added `bondsReturnRate` / `stocksAllocationPct` fields; `effectiveReturnRate()` blends them
- Changed cash + actualForced to deposit gross (final tax pass handles deduction)

**4. Fixed `YearTable.jsx`**

- Changed all `endingBalance={displayX}` → `endingBalance={row.X}` (4 account tooltips now always deterministic, so tooltip math reconciles)
- Added `rmdForcedCashIn` inflow row to cash tooltip ("RMD proceeds (gross)")
- Added opening balance rows to all four account tooltips
- Added `Net: +/-$X` as the tooltip ending label
- Fixed pre-tax tooltip: `preTaxSpending = preTaxDrawn - cashRefillFromPreTaxGross` (avoids double-counting refill)
- Removed `ltcgTax` from taxable tooltip rows (was double-counting since already in `taxPaidFromTaxable`)

**5. Added separate return rates feature**

- `bondsReturnRate` (default 2.0%) + `stocksAllocationPct` (default 60%) added to state
- Blended return = `w * stockReturn + (1-w) * bondReturn` used in deterministic + MC
- UI controls added to GlobalInputs.jsx

**6. E2E test flakiness fix**

- Sticky header test was flaky due to MC Worker completing mid-scroll. Fixed by waiting for `#totalModeSelect` (only rendered after MC data arrives) in `beforeEach`.

### Test results

All 56 unit tests pass. All 10 E2E tests pass.
