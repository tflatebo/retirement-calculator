## Completed: Fix YoY Detail Table Tooltip Mismatch

### Bug: Tooltip ending balance didn't match cell display in median mode

**Root cause**: In `YearTable.jsx`, when `totalMode === 'median'`:
- Cell displayed `displayX` (MC median, e.g., `mc.preTax`)
- Tooltip `endingBalance` showed `row.X` (deterministic value)
- These values differ because MC median ≠ deterministic fixed-return result

**Fix**: Changed all 4 account `CellTooltip` components to use `displayX` for `endingBalance`.
Also changed `endingLabel` to show "Ending balance (median)" in median mode instead of
the deterministic "Net: +/- $X" label (which would mix median current with deterministic previous).

### Next steps (if any further goals)
- All GOAL.md items addressed
- All unit and E2E tests pass
