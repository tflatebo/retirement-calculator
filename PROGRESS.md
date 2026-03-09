## 2026-03-08 — Verify and Regression-Test Roth Tooltip Inflows/Outflows (Round 3)

**Problem reported**: "roth is missing inflows and outflows" — after implementing MC flow fields, user saw incomplete Roth tooltip.

**Investigation**: Ran targeted Playwright tests checking:
- Accumulation year (age 43): Roth cell tooltip in both deterministic and median modes
- Decumulation year (age 55): Roth cell tooltip in both modes

**Findings**: The Roth tooltip IS correctly showing flows in both modes:
- Accumulation: Opening balance + Investment growth ($7K) + Contribution ($16K) + Net/Ending
- Decumulation: Opening balance + Investment growth ($19K) + Roth conversion (in) ($50K) + Net/Ending
- The MC flow fields (`rothReturn_p50`, `rothContrib_p50`, `rothConversion_p50`) are correctly computed and displayed

**Conclusion**: The bug was fixed by the prior MC flow implementation. This round adds regression tests.

**New tests** (`e2e/yearTable.spec.js`):
- `Roth tooltip shows investment growth and contribution in accumulation years` — verifies both modes
- `Roth tooltip shows conversion inflow in decumulation years` — verifies both modes

**Status**: 58 unit tests + 8 E2E tests all pass.

---

## 2026-03-08 — Fix YoY Tooltip Flow Rows / Ledger Inconsistency (Round 2)

**Problem**: In median mode, the tooltip showed deterministic flow rows (investment growth, contributions, withdrawals etc.) that don't add up to the MC median ending balance — because they're from a different distribution. This made the tooltip numbers look wrong even after the ending-balance fix.

**Root cause analysis**:
- Wrote a ledger unit test: `opening + inflows - outflows = ending` for all 4 accounts across all years
- Test PASSES for deterministic mode — the engine math is correct
- The inconsistency is purely a display issue: median mode can't show per-transaction flows (the MC worker only outputs per-account totals by age, not individual flows)

**Fix** (`YearTable.jsx`):
- **Median mode**: show only `Opening balance (median)` (previous year's MC median) + `Net: +/-X (median)` label. Flow rows hidden since they'd be from a different distribution.
- **Deterministic mode**: unchanged — full flow breakdown shown, always reconciles (opening + flows = ending)

**New test** (`calculator.test.js`):
- `per-account ledger reconciles` — verifies opening + inflows - outflows = ending (±$1) for cash, taxable, pre-tax, roth across every year of default simulation

---

## 2026-03-08 — Fix YoY Detail Table Tooltip Mismatch

**Goal**: Fix bug where tooltip ending balance didn't match cell display value in the Year-over-Year detail table.

**Root cause identified**:
In `YearTable.jsx` (lines 315-345), when `totalMode === 'median'`:
- Cell showed `displayPreTax` = `mc.preTax` (MC median)
- Tooltip `endingBalance={row.preTax}` = deterministic value
- These differ because Monte Carlo median ≠ fixed-return deterministic result

**TDD approach**:
1. Wrote failing E2E test `tooltip ending balance matches cell display value in median mode` in `e2e/yearTable.spec.js`
   - Confirmed it fails: cell shows $303K (median taxable) vs tooltip $350K (deterministic)
2. Fixed `YearTable.jsx`:
   - Changed `endingBalance={row.X}` → `endingBalance={displayX}` for all 4 accounts
   - Changed `endingLabel` to show `"Ending balance (median)"` in median mode instead of mixing deterministic net-change with median ending balance
3. All tests pass: 56 unit tests + 6 E2E tests

**Files changed**:
- `src/components/YearTable.jsx` — fix tooltip endingBalance and endingLabel
- `e2e/yearTable.spec.js` — add 2 new tests (median mode consistency + deterministic mode consistency)
