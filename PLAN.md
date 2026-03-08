# Plan

## Status: All ledger accounting bugs fixed

### Root causes identified and fixed

1. **MC median vs deterministic mismatch in tooltips** — FIXED
   Changed all `endingBalance={displayX}` → `endingBalance={row.X}` in `YearTable.jsx`.
   Tooltip rows always use deterministic flows; ending balance now consistent with flows.

2. **LTCG double-counting in taxable tooltip** — FIXED
   Removed `ltcgTax` row from taxable tooltip. It was already included in `taxPaidFromTaxable`.

3. **Forced RMD not displayed in cash tooltip** — FIXED
   Added `rmdForcedCashIn` inflow row ("RMD proceeds (gross)") to cash tooltip.
   Calculator already tracked this; just needed to surface it in the UI.

4. **Pre-tax refill double-counting** — FIXED
   `preTaxSpending = preTaxDrawn - cashRefillFromPreTaxGross` prevents showing refill twice.

### All tests pass

- 56 unit tests (Vitest)
- 10 E2E tests (Playwright)

### Double-entry ledger invariants (per account)

Each tooltip now satisfies: `opening + inflows - outflows = ending balance`

- **Cash**: opening + interest + contrib + RMD proceeds + cash refill in − spending − tax = ending
- **Taxable**: opening + growth + contrib − spending − tax − cash refill out = ending
- **Pre-Tax**: opening + growth + contrib − spending − roth conv − cash refill gross out = ending
- **Roth**: opening + growth + contrib + roth conv in − spending − tax − cash refill out = ending

## Next steps (if any)

None — goals from GOAL.md are complete.
