# YearTable Tooltips & Sticky Header

## Task 1: Extend Engine Snapshot with Per-Account Flows

**File:** `src/engine/calculator.js`

Add these fields to the `years.push({...})` object (line 709):
- `cashDrawn` — cash used for spending
- `taxableDrawn` — taxable sold for spending
- `rothDrawn` — Roth withdrawn for spending
- `cashRefill` — cash replenished from other accounts
- `cashRefillSource` — which account funded the refill ("taxable", "preTax", or "roth")
- `cashReturn` — interest earned on cash bucket
- `taxReturn` — investment growth on taxable
- `preTaxReturn` — investment growth on pre-tax
- `rothReturn` — investment growth on Roth
- `taxPaidFromCash` — taxes paid from cash
- `taxPaidFromTaxable` — taxes paid from taxable
- `taxPaidFromRoth` — taxes paid from Roth
- `ltcgTax` — LTCG tax amount
- `stateTax` — state income tax
- `totalTax` — total taxes paid

Track these local variables throughout the decumulation branch and capture them in the snapshot. For accumulation, track per-account contributions (preTaxContrib, rothContrib, taxableContrib, cashContrib) from the existing `contrib` object.

Also add accumulation-phase fields:
- `preTaxContrib`, `rothContrib`, `taxableContrib`, `cashContrib`

## Task 2: Build Tooltip Component for Account Cells

**File:** `src/components/YearTable.jsx`

Create an `AccountTooltip` component rendered as a CSS-positioned popup on hover. For each account cell (Cash, Taxable, Pre-Tax, Roth), show a small table:

**Cash tooltip example:**
| Item | Amount |
|------|--------|
| Interest earned | +$2,000 |
| Spending withdrawal | -$48,000 |
| Cash replenishment | +$30,000 |
| Tax payment | -$5,000 |
| **Ending balance** | **$50,000** |

**Pre-Tax tooltip example:**
| Item | Amount |
|------|--------|
| Investment growth | +$40,000 |
| Roth conversion | -$50,000 |
| Spending withdrawal | -$20,000 |
| RMD (forced) | -$5,000 |
| Cash replenishment | -$10,000 |
| **Ending balance** | **$800,000** |

Only show rows where the amount is non-zero.

## Task 3: Build Tooltip for Total Column

**File:** `src/components/YearTable.jsx`

The Total column tooltip shows all inflows and outflows across the portfolio:

| Item | Amount |
|------|--------|
| Investment returns | +$60,000 |
| Cash interest | +$2,000 |
| Contributions (accumulation) | +$25,000 |
| Social Security | +$51,600 |
| Pension income | +$12,000 |
| Spending | -$80,000 |
| Federal tax | -$8,000 |
| LTCG tax | -$1,200 |
| State tax | -$2,000 |
| **Net change** | **+$32,400** |

Each row annotated with purpose. Only show non-zero rows.

## Task 4: Sticky Header

**File:** `src/App.css`

The `.year-table th` already has `position: sticky; top: 0;` but the `.table-scroll` container's `overflow-x: auto` creates a new stacking context that prevents sticky from working relative to the viewport. Fix by:

1. Add `z-index: 10` to `.year-table th` so headers render above scrolling content
2. Ensure the `.table-scroll` container doesn't clip the sticky behavior — may need to restructure so the table is not inside an overflow container, or accept sticky within the scroll container only

## Task 5: Tooltip CSS

**File:** `src/App.css`

Add styles for `.cell-tooltip-wrapper` (position: relative) and `.cell-tooltip` (position: absolute, hidden by default, shown on hover). Reuse the existing `.chart-tooltip` design language (white bg, border-radius: 8px, box-shadow).
