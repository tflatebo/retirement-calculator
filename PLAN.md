# Plan

## Step 1: Fix pre-tax ledger display bug (Bug 1)
- Add `cashRefillFromPreTaxGross` field to calculator.js snapshot (gross amount taken from preTax for cash refill, separate from NET cashRefill)
- Fix YearTable.jsx: pre-tax tooltip currently double-counts by showing preTaxDrawn (which already includes gross refill) + cashRefill (net); fix to show separate spending vs refill
- Add opening balance row to each account tooltip
- Add net change to each account tooltip

## Step 2: Add bonds return rate + stocks/bonds allocation (Bug 2)
- Add `bondsReturnRate: 2.0` and `stocksAllocationPct: 60` to DEFAULT_STATE
- Calculator uses blended effective return: `(stocksAllocationPct/100)*realReturn + (1-stocksAllocationPct/100)*bondsReturnRate`
- Add UI controls in GlobalInputs.jsx; add fields to COMPONENT_FIELD_REFS in tests

## Step 3: Cash return rate (Goal 3)
- Already implemented via `cashReturnRate` in DEFAULT_STATE + CashRules.jsx; goal is done
