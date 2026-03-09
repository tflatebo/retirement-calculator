# One-Time Accumulation & Distribution Events

**Date:** 2026-03-09

## Summary

Add support for one-time financial events at a specific age — both inflows (inheritance, business sale, bonus) and outflows (gifts to kids, large purchases). Events apply at any age, pre- or post-retirement.

## Schema

Two new arrays in `defaultState.js`, defaulting to empty:

```js
oneTimeInflows: [
  // { id, name, age, preTax, roth, taxable, cash, isTaxableIncome }
]

oneTimeOutflows: [
  // { id, name, age, amount }
]
```

- **Inflows**: money arriving into specific accounts. `isTaxableIncome: true` means the total amount is added to ordinary income for that year's tax calculation.
- **Outflows**: money leaving the portfolio. The existing withdrawal strategy determines which accounts to draw from.

## Engine (`calculator.js`)

In the year loop, after growth is applied:

- **Inflows**: matched by `event.age === age`. Add amounts directly to accounts (preTax, roth, taxable, cash). Increase `taxableBasis` by the taxable account inflow. If `isTaxableIncome`, add total to that year's ordinary income.
- **Outflows**: matched by `event.age === age`. Treated as extra spending on top of normal spending for that year. During accumulation and decumulation alike, the withdrawal machinery draws from accounts (cash first, then taxable, etc.).
- Multiple events at the same age are summed.

## UI

Two new components placed between `ContributionPhases` and `TaxInputs` in the left panel:

**`OneTimeInflows.jsx`** — collapsible panel, add/remove rows. Each row:
- Name (text), Age (number), "Taxable income?" toggle
- Four amount fields: Pre-tax, Roth, Taxable, Cash

**`OneTimeOutflows.jsx`** — collapsible panel, add/remove rows. Each row:
- Name (text), Age (number), Amount

Both follow the identical add/remove/edit pattern from `ContributionPhases.jsx`. No gap/overlap validation needed.

## Testing

**Unit tests** (`calculator.test.js`):
- Inflow at age X increases correct accounts by correct amounts
- Taxable inflow adds to that year's income; non-taxable does not
- Outflow at age X reduces portfolio by correct amount
- Ledger reconciliation test continues to pass
- `COMPONENT_FIELD_REFS` updated with `oneTimeInflows` and `oneTimeOutflows`

**E2E tests** (Playwright):
- Add an inflow event → year-table row at that age shows higher balance
- Add an outflow event → year-table row at that age shows lower balance
