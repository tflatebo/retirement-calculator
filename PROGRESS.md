# Progress

## Iteration 1

### Bug Fix: Pre-tax ledger math (Goal 1)
- Added `cashRefillFromPreTaxGross` field to calculator.js snapshot to track the actual gross amount deducted from pre-tax for cash refill (previously `preTaxDrawn` conflated spending and refill gross, causing the tooltip to double-count)
- Fixed YearTable.jsx pre-tax tooltip: "Spending withdrawal" now shows only the actual spending portion (`preTaxDrawn - cashRefillFromPreTaxGross`); "Cash refill (gross out)" shows the actual gross amount
- Added opening balance row to all four account tooltips so users can verify: opening + flows = ending
- Added per-account net change display in tooltip ending label (mirrors the existing Total column net change)
- Tests: Added `per-account ledger accounting` test suite with 3 tests verifying math correctness

### Bug Fix: Volatility/bonds return rate (Goal 2)
- Added `bondsReturnRate: 2.0` and `stocksAllocationPct: 60` to DEFAULT_STATE
- Calculator now uses blended effective return: `(stocksAllocationPct/100)*stockReturn + (1-stocksAllocationPct/100)*bondsReturn` for both deterministic runs and Monte Carlo mean
- `computeSummary` discount rate updated to use blended effective return
- GlobalInputs.jsx: added "Bond Return Rate" and "Stocks Allocation %" input fields; renamed "Expected Annual Return" to "Stock Return Rate" for clarity
- Tests: Added fields to COMPONENT_FIELD_REFS; added `stocks/bonds blended return` test

### Goal 3: Cash return rate
- Already fully implemented: `cashReturnRate` field exists in DEFAULT_STATE (4.0% default), exposed in CashRules.jsx, and used as a separate return rate for the cash bucket in calculator.js
- No changes needed

### All tests passing: 54/54
