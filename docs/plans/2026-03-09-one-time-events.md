# One-Time Inflow & Outflow Events Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add one-time financial inflows (inheritance, windfall) and outflows (gifts to kids, large purchases) at a specific age, applicable both pre- and post-retirement.

**Architecture:** Two new state arrays (`oneTimeInflows`, `oneTimeOutflows`) follow the existing `contributionPhases`/`spendingPhases` pattern. Two helper functions in `calculator.js` accumulate per-age totals. Inflows credit accounts directly (tracked via existing `*Contrib` ledger vars). Outflows during decumulation add to `annualSpend` (handled by existing withdrawal strategy); during accumulation they use a simple cash-first draw into existing `*Drawn` ledger vars. Two new UI components mirror `ContributionPhases.jsx`.

**Tech Stack:** React, Vitest, Playwright, Recharts (no new dependencies)

---

### Task 1: Add schema fields to `defaultState.js`

**Files:**
- Modify: `src/defaultState.js`

**Step 1: Add the two new arrays at the bottom of DEFAULT_STATE**

Open `src/defaultState.js`. After the `spendingPhases` array (line 86, before the closing `};`), add:

```js
  // One-time financial events (any age, pre- or post-retirement)
  oneTimeInflows: [],
  oneTimeOutflows: [],
```

**Step 2: Verify the file looks right**

Run: `npx vitest run src/engine/calculator.test.js`
Expected: All tests pass (no schema breakage yet — new fields are just empty arrays).

**Step 3: Commit**

```bash
git add src/defaultState.js
git commit -m "feat: add oneTimeInflows/oneTimeOutflows to DEFAULT_STATE schema"
```

---

### Task 2: Add engine helper functions in `calculator.js`

**Files:**
- Modify: `src/engine/calculator.js` (after the `getContributions` function, ~line 157)

**Step 1: Write the failing test first** (see Task 5 — do Task 5 before implementing)

Actually: write the tests in Task 5, then come back here. The tests reference engine behavior. Keep reading to understand what to implement.

**Step 2: Add two helper functions after `getContributions` (~line 157)**

```js
/**
 * Aggregate all one-time inflows for a given age.
 * Returns per-account totals plus total taxable income from flagged events.
 */
function getInflowsForAge(age, oneTimeInflows) {
  const events = (oneTimeInflows || []).filter(e => e.age === age);
  return events.reduce((acc, e) => ({
    preTax: acc.preTax + (e.preTax || 0),
    roth:   acc.roth   + (e.roth   || 0),
    taxable: acc.taxable + (e.taxable || 0),
    cash:   acc.cash   + (e.cash   || 0),
    taxableIncome: acc.taxableIncome + (e.isTaxableIncome
      ? (e.preTax || 0) + (e.roth || 0) + (e.taxable || 0) + (e.cash || 0)
      : 0),
  }), { preTax: 0, roth: 0, taxable: 0, cash: 0, taxableIncome: 0 });
}

/**
 * Sum all one-time outflows for a given age.
 */
function getOutflowForAge(age, oneTimeOutflows) {
  return (oneTimeOutflows || [])
    .filter(e => e.age === age)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
}
```

**Step 3: Destructure the new fields in `runSimulation`**

Find the destructuring block around line 167. After `spendingPhases,` (line 184), add:

```js
    oneTimeInflows = [],
    oneTimeOutflows = [],
```

**Step 4: Apply inflows inside the accumulation block**

Find the accumulation block (`if (isAccumulation) {`). After the cash interest lines (after `contributions = contrib.preTax + ...`, ~line 321), add:

```js
      // One-time inflows (accumulation)
      // Note: isTaxableIncome has no effect here — accumulation phase has no income tax model.
      const inflow = getInflowsForAge(age, oneTimeInflows);
      preTax   += inflow.preTax;
      roth     += inflow.roth;
      taxable  += inflow.taxable;
      taxableBasis += inflow.taxable;
      cash     += inflow.cash;
      preTaxContrib   += inflow.preTax;
      rothContrib     += inflow.roth;
      taxableContrib  += inflow.taxable;
      cashContrib     += inflow.cash;
```

**Step 5: Apply outflows inside the accumulation block**

After the inflow block above (still inside `if (isAccumulation)`), add:

```js
      // One-time outflows (accumulation): cash-first draw
      const outflowAmt = getOutflowForAge(age, oneTimeOutflows);
      if (outflowAmt > 0) {
        let rem = outflowAmt;
        const fromCash = Math.min(cash, rem);
        cash    -= fromCash; cashDrawn    += fromCash; rem -= fromCash;
        if (rem > 0) {
          const fromTaxable = Math.min(taxable, rem);
          taxable -= fromTaxable; taxableDrawn += fromTaxable; rem -= fromTaxable;
        }
        if (rem > 0) {
          const fromPreTax = Math.min(preTax, rem);
          preTax  -= fromPreTax; preTaxDrawn  += fromPreTax; rem -= fromPreTax;
        }
        if (rem > 0) {
          const fromRoth = Math.min(roth, rem);
          roth    -= fromRoth;   rothDrawn    += fromRoth;
        }
      }
```

**Step 6: Apply inflows inside the decumulation block**

Find the decumulation block (`} else {`). After the growth lines (after `rothReturn = roth - preGrowthRoth;`, ~line 356), add:

```js
      // One-time inflows (decumulation)
      const inflow = getInflowsForAge(age, oneTimeInflows);
      preTax   += inflow.preTax;
      roth     += inflow.roth;
      taxable  += inflow.taxable;
      taxableBasis += inflow.taxable;
      cash     += inflow.cash;
      preTaxContrib   += inflow.preTax;
      rothContrib     += inflow.roth;
      taxableContrib  += inflow.taxable;
      cashContrib     += inflow.cash;
```

**Step 7: Apply decumulation outflows to annualSpend**

Find where `annualSpend` is set (~line 376 `annualSpend = rawAnnualSpend;`). After the healthcare line (~line 382), add:

```js
      // One-time outflows (decumulation): added to spending, handled by withdrawal strategy
      annualSpend += getOutflowForAge(age, oneTimeOutflows);
```

**Step 8: Add inflow taxable income to tax computation**

Find the final tax computation (~line 614):
```js
const ordinaryIncomePreSS = preTaxDrawn + conversionTaxableAmount + yearPensionIncome;
```

Change it to:
```js
const ordinaryIncomePreSS = preTaxDrawn + conversionTaxableAmount + yearPensionIncome + inflow.taxableIncome;
```

**Step 9: Run tests**
```bash
npx vitest run src/engine/calculator.test.js
```
Expected: All existing tests still pass (new fields default to `[]`, behavior unchanged).

**Step 10: Commit**
```bash
git add src/engine/calculator.js
git commit -m "feat: apply one-time inflows/outflows in simulation engine"
```

---

### Task 3: Unit tests for engine behavior

**Files:**
- Modify: `src/engine/calculator.test.js`

**Step 1: Add tests at the bottom of the file (before the last `})`)**

Add a new `describe` block:

```js
// ─── One-time events ──────────────────────────────────────────────────────────

describe('one-time inflow and outflow events', () => {
  const BASE = {
    ...DEFAULT_STATE,
    // Use simple params to make expected values easy to reason about
    realReturn: 0,        // no growth — balance changes are only from events
    bondsReturnRate: 0,
    cashReturnRate: 0,
    inflationRate: 0,
    numSimulations: 1,
    // Age range: 42–60, retirement at 55
    person1Age: 42,
    retirementAge: 55,
    endOfPlanAge: 60,
    // No contributions or spending to isolate event effects
    contributionPhases: [],
    spendingPhases: [],
    // Zero starting balances — easier to verify
    cashBalance: 0,
    taxableBalance: 0,
    preTaxBalance: 0,
    rothBalance: 0,
    taxableCostBasis: 0,
    // No SS, no healthcare, no pension
    person1SSMonthly: 0,
    person2SSMonthly: 0,
    healthcareCostMonthly: 0,
    pensionIncome: 0,
    rothConversionAmount: 0,
    oneTimeInflows: [],
    oneTimeOutflows: [],
  };

  it('non-taxable inflow at accumulation age deposits to correct accounts', () => {
    const state = {
      ...BASE,
      oneTimeInflows: [
        { id: 1, name: 'Inheritance', age: 50, preTax: 10000, roth: 5000, taxable: 20000, cash: 3000, isTaxableIncome: false },
      ],
    };
    const years = runDeterministic(state);
    const yr = years.find(y => y.age === 50);

    expect(yr.preTax).toBe(10000);
    expect(yr.roth).toBe(5000);
    expect(yr.taxable).toBe(20000);
    expect(yr.cash).toBe(3000);
  });

  it('non-taxable inflow at decumulation age deposits to correct accounts', () => {
    const state = {
      ...BASE,
      oneTimeInflows: [
        { id: 1, name: 'Windfall', age: 57, preTax: 0, roth: 0, taxable: 100000, cash: 0, isTaxableIncome: false },
      ],
    };
    const years = runDeterministic(state);
    const yr = years.find(y => y.age === 57);

    expect(yr.taxable).toBe(100000);
  });

  it('taxable inflow increases federalTax in decumulation year', () => {
    const stateNo = {
      ...BASE,
      person1SSMonthly: 0,
      standardDeduction: 30000,
      oneTimeInflows: [
        { id: 1, name: 'Non-taxable', age: 57, preTax: 0, roth: 0, taxable: 50000, cash: 0, isTaxableIncome: false },
      ],
    };
    const stateYes = {
      ...stateNo,
      oneTimeInflows: [
        { id: 1, name: 'Taxable sale', age: 57, preTax: 0, roth: 0, taxable: 50000, cash: 0, isTaxableIncome: true },
      ],
    };

    const yrsNo  = runDeterministic(stateNo);
    const yrsYes = runDeterministic(stateYes);

    const yrNo  = yrsNo.find(y => y.age === 57);
    const yrYes = yrsYes.find(y => y.age === 57);

    expect(yrYes.federalTax).toBeGreaterThan(yrNo.federalTax);
  });

  it('outflow at accumulation age reduces portfolio', () => {
    const state = {
      ...BASE,
      cashBalance: 80000,
      oneTimeOutflows: [
        { id: 1, name: 'Gift to kids', age: 50, amount: 50000 },
      ],
    };
    const years = runDeterministic(state);
    const before = years.find(y => y.age === 49);
    const at     = years.find(y => y.age === 50);

    // Outflow reduces cash by 50k (cash had 80k, no return)
    expect(at.cash).toBe((before?.cash ?? 80000) - 50000);
    expect(at.total).toBeLessThan(before?.total ?? 80000);
  });

  it('outflow at decumulation age reduces portfolio', () => {
    const state = {
      ...BASE,
      cashBalance: 200000,
      oneTimeOutflows: [
        { id: 1, name: 'Gift to kids', age: 58, amount: 100000 },
      ],
    };
    const years = runDeterministic(state);
    const before = years.find(y => y.age === 57);
    const at     = years.find(y => y.age === 58);

    expect(at.total).toBeLessThan(before?.total ?? 200000);
  });

  it('per-account ledger still reconciles with one-time events', () => {
    const state = {
      ...BASE,
      cashBalance: 100000,
      taxableBalance: 200000,
      preTaxBalance: 300000,
      rothBalance: 50000,
      oneTimeInflows: [
        { id: 1, name: 'Windfall (accum)',  age: 48, preTax: 5000, roth: 0, taxable: 10000, cash: 2000, isTaxableIncome: false },
        { id: 2, name: 'Windfall (decum)',  age: 57, preTax: 0,    roth: 0, taxable: 50000, cash: 0,    isTaxableIncome: false },
      ],
      oneTimeOutflows: [
        { id: 3, name: 'Gift (accum)',  age: 50, amount: 20000 },
        { id: 4, name: 'Gift (decum)',  age: 58, amount: 30000 },
      ],
    };
    const years = runDeterministic(state);
    const TOLERANCE = 1;

    for (let i = 1; i < years.length; i++) {
      const prev = years[i - 1];
      const cur  = years[i];

      const cashComputed = prev.cash
        + (cur.cashReturn ?? 0)
        + (cur.cashContrib ?? 0)
        + (cur.rmdForcedCashIn ?? 0)
        + (cur.cashRefill ?? 0)
        - (cur.cashDrawn ?? 0)
        - (cur.taxPaidFromCash ?? 0);
      expect(Math.abs(cur.cash - Math.max(0, cashComputed)) < TOLERANCE,
        `Cash ledger at age ${cur.age}: computed=${cashComputed.toFixed(2)}, actual=${cur.cash.toFixed(2)}`).toBe(true);

      const taxableRefillOut = cur.cashRefillSource === 'taxable' ? (cur.cashRefill ?? 0) : 0;
      const taxableComputed = prev.taxable
        + (cur.taxReturn ?? 0)
        + (cur.taxableContrib ?? 0)
        - (cur.taxableDrawn ?? 0)
        - (cur.taxPaidFromTaxable ?? 0)
        - taxableRefillOut;
      expect(Math.abs(cur.taxable - Math.max(0, taxableComputed)) < TOLERANCE,
        `Taxable ledger at age ${cur.age}: computed=${taxableComputed.toFixed(2)}, actual=${cur.taxable.toFixed(2)}`).toBe(true);

      const preTaxComputed = prev.preTax
        + (cur.preTaxReturn ?? 0)
        + (cur.preTaxContrib ?? 0)
        - (cur.rothConversion ?? 0)
        - (cur.preTaxDrawn ?? 0);
      expect(Math.abs(cur.preTax - Math.max(0, preTaxComputed)) < TOLERANCE,
        `PreTax ledger at age ${cur.age}: computed=${preTaxComputed.toFixed(2)}, actual=${cur.preTax.toFixed(2)}`).toBe(true);

      const rothRefillOut = cur.cashRefillSource === 'roth' ? (cur.cashRefill ?? 0) : 0;
      const rothComputed = prev.roth
        + (cur.rothReturn ?? 0)
        + (cur.rothContrib ?? 0)
        + (cur.rothConversion ?? 0)
        - (cur.rothDrawn ?? 0)
        - (cur.taxPaidFromRoth ?? 0)
        - rothRefillOut;
      expect(Math.abs(cur.roth - Math.max(0, rothComputed)) < TOLERANCE,
        `Roth ledger at age ${cur.age}: computed=${rothComputed.toFixed(2)}, actual=${cur.roth.toFixed(2)}`).toBe(true);
    }
  });
});
```

Also update `COMPONENT_FIELD_REFS` in the schema test. Find the array (around line 175) and add at the end, before the closing `]`:

```js
    // OneTimeInflows.jsx + OneTimeOutflows.jsx
    'oneTimeInflows',
    'oneTimeOutflows',
```

**Step 2: Run tests to confirm they fail (engine not yet implemented)**

If you're doing TDD strictly (Task 5 before Task 2), run now:
```bash
npx vitest run src/engine/calculator.test.js
```
Expected: New tests FAIL. Existing tests PASS.

**Step 3: After implementing Task 2, run to confirm all pass**
```bash
npx vitest run src/engine/calculator.test.js
```
Expected: All tests PASS.

**Step 4: Commit**
```bash
git add src/engine/calculator.test.js
git commit -m "test: one-time inflow/outflow engine unit tests"
```

---

### Task 4: `OneTimeInflows.jsx` component

**Files:**
- Create: `src/components/OneTimeInflows.jsx`

**Step 1: Create the file**

```jsx
import React from 'react';
import { useAppState } from '../context/StateContext';
import { CollapsiblePanel } from './CollapsiblePanel';

export function OneTimeInflows() {
  const { state, updateField } = useAppState();
  const events = state.oneTimeInflows;

  function updateEvent(id, field, value) {
    const updated = events.map(e =>
      e.id === id
        ? { ...e, [field]: field === 'name' ? value : field === 'isTaxableIncome' ? value : Number(value) }
        : e
    );
    updateField('oneTimeInflows', updated);
  }

  function addEvent() {
    const last = events[events.length - 1];
    updateField('oneTimeInflows', [
      ...events,
      {
        id: Date.now(),
        name: 'Inflow',
        age: last ? Math.min(last.age + 5, state.endOfPlanAge) : state.person1Age + 10,
        preTax: 0,
        roth: 0,
        taxable: 100000,
        cash: 0,
        isTaxableIncome: false,
      },
    ]);
  }

  function removeEvent(id) {
    updateField('oneTimeInflows', events.filter(e => e.id !== id));
  }

  return (
    <CollapsiblePanel title="One-Time Inflows">
      <p className="section-note">
        Model windfalls, inheritances, or other lump-sum deposits at a specific age. Toggle "Taxable income?" if the event is ordinary income (e.g., selling a business). Applies in both accumulation and retirement.
      </p>

      <div className="spending-phases-list">
        {events.map(evt => (
          <div key={evt.id} className="spending-phase-row">
            <div className="phase-header">
              <input
                className="phase-name-input"
                type="text"
                value={evt.name}
                onChange={e => updateEvent(evt.id, 'name', e.target.value)}
                placeholder="Event name"
                aria-label="Inflow event name"
              />
              <button
                className="btn-remove"
                onClick={() => removeEvent(evt.id)}
                title="Remove event"
              >
                Remove
              </button>
            </div>

            <div className="phase-fields contrib-phase-fields">
              <div className="phase-field">
                <label>Age</label>
                <input
                  type="number"
                  value={evt.age}
                  min={state.person1Age}
                  max={state.endOfPlanAge}
                  onChange={e => updateEvent(evt.id, 'age', Math.min(Math.max(Number(e.target.value), state.person1Age), state.endOfPlanAge))}
                  className="input-control"
                />
              </div>

              <div className="phase-field">
                <label>Taxable income?</label>
                <input
                  type="checkbox"
                  checked={!!evt.isTaxableIncome}
                  onChange={e => updateEvent(evt.id, 'isTaxableIncome', e.target.checked)}
                  aria-label="Is taxable income"
                />
              </div>

              <div className="contrib-amounts-grid">
                <div className="phase-field">
                  <label>Pre-Tax</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.preTax} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'preTax', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Roth</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.roth} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'roth', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Taxable</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.taxable} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'taxable', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Cash</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.cash} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'cash', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-add" onClick={addEvent}>
        + Add Inflow
      </button>
    </CollapsiblePanel>
  );
}
```

**Step 2: Verify it renders by importing in App.jsx (done in Task 6)**

---

### Task 5: `OneTimeOutflows.jsx` component

**Files:**
- Create: `src/components/OneTimeOutflows.jsx`

**Step 1: Create the file**

```jsx
import React from 'react';
import { useAppState } from '../context/StateContext';
import { CollapsiblePanel } from './CollapsiblePanel';

export function OneTimeOutflows() {
  const { state, updateField } = useAppState();
  const events = state.oneTimeOutflows;

  function updateEvent(id, field, value) {
    const updated = events.map(e =>
      e.id === id
        ? { ...e, [field]: field === 'name' ? value : Number(value) }
        : e
    );
    updateField('oneTimeOutflows', updated);
  }

  function addEvent() {
    const last = events[events.length - 1];
    updateField('oneTimeOutflows', [
      ...events,
      {
        id: Date.now(),
        name: 'Outflow',
        age: last ? Math.min(last.age + 5, state.endOfPlanAge) : state.person1Age + 10,
        amount: 50000,
      },
    ]);
  }

  function removeEvent(id) {
    updateField('oneTimeOutflows', events.filter(e => e.id !== id));
  }

  return (
    <CollapsiblePanel title="One-Time Outflows">
      <p className="section-note">
        Model gifts, large purchases, or other lump-sum withdrawals at a specific age. Money is drawn using your configured withdrawal strategy. Applies in both accumulation and retirement.
      </p>

      <div className="spending-phases-list">
        {events.map(evt => (
          <div key={evt.id} className="spending-phase-row">
            <div className="phase-header">
              <input
                className="phase-name-input"
                type="text"
                value={evt.name}
                onChange={e => updateEvent(evt.id, 'name', e.target.value)}
                placeholder="Event name"
                aria-label="Outflow event name"
              />
              <button
                className="btn-remove"
                onClick={() => removeEvent(evt.id)}
                title="Remove event"
              >
                Remove
              </button>
            </div>

            <div className="phase-fields">
              <div className="phase-field">
                <label>Age</label>
                <input
                  type="number"
                  value={evt.age}
                  min={state.person1Age}
                  max={state.endOfPlanAge}
                  onChange={e => updateEvent(evt.id, 'age', Math.min(Math.max(Number(e.target.value), state.person1Age), state.endOfPlanAge))}
                  className="input-control"
                />
              </div>
              <div className="phase-field">
                <label>Amount</label>
                <div className="input-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    value={evt.amount}
                    min={0}
                    step={1000}
                    onChange={e => updateEvent(evt.id, 'amount', e.target.value)}
                    className="input-control has-prefix"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-add" onClick={addEvent}>
        + Add Outflow
      </button>
    </CollapsiblePanel>
  );
}
```

---

### Task 6: Wire components into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add imports after the `ContributionPhases` import (~line 10)**

```js
import { OneTimeInflows } from './components/OneTimeInflows';
import { OneTimeOutflows } from './components/OneTimeOutflows';
```

**Step 2: Add components to the inputs panel**

Find the `<aside className="inputs-panel">` block. After `<ContributionPhases />` (line 182), add:

```jsx
            <OneTimeInflows />
            <OneTimeOutflows />
```

**Step 3: Start dev server and do a quick visual check**

```bash
npm run dev
```

Open http://localhost:5173. Verify:
- "One-Time Inflows" and "One-Time Outflows" collapsible panels appear below Contribution Phases
- Clicking "+ Add Inflow" shows a row with Age, Taxable income? checkbox, and 4 account fields
- Clicking "+ Add Outflow" shows a row with Age and Amount
- Adding a $100k taxable inflow at age 60 changes the chart/table for that year

**Step 4: Commit**

```bash
git add src/App.jsx src/components/OneTimeInflows.jsx src/components/OneTimeOutflows.jsx
git commit -m "feat: add OneTimeInflows and OneTimeOutflows UI components"
```

---

### Task 7: E2E tests

**Files:**
- Create: `e2e/oneTimeEvents.spec.js`

**Step 1: Write the test file**

```js
import { test, expect } from '@playwright/test';

test.describe('One-time inflow and outflow events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.top-strip', { timeout: 10000 });

    // Open One-Time Inflows panel
    await page.locator('text=One-Time Inflows').click();
    await page.waitForTimeout(200);
  });

  test('adding an inflow increases portfolio in the target year', async ({ page }) => {
    // Open Year-over-Year Detail to read table values
    await page.locator('text=Year-over-Year Detail').click();
    await page.waitForSelector('.year-table tbody tr', { timeout: 5000 });
    // Wait for MC to settle
    await page.waitForSelector('#totalModeSelect', { timeout: 30000 });

    // Switch to deterministic for stable numbers
    await page.locator('#totalModeSelect').selectOption('deterministic');

    // Read the total for a mid-plan row (age 60) before adding inflow
    const rows = page.locator('.year-table tbody tr');
    const rowCount = await rows.count();

    // Find row for age 60
    let targetRow = null;
    for (let i = 0; i < rowCount; i++) {
      const cells = rows.nth(i).locator(':scope > td');
      const ageText = await cells.nth(1).innerText();
      if (ageText.trim() === '60') {
        targetRow = rows.nth(i);
        break;
      }
    }
    expect(targetRow).not.toBeNull();

    const totalCellBefore = targetRow.locator(':scope > td').nth(7);
    const totalBefore = await totalCellBefore.innerText();

    const parse = s => {
      const str = s.trim().replace(/[$,]/g, '');
      if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
      if (str.endsWith('K')) return parseFloat(str) * 1_000;
      return parseFloat(str);
    };

    // Add a $500K inflow at age 60
    await page.locator('button.btn-add', { hasText: '+ Add Inflow' }).click();
    await page.waitForTimeout(100);

    // Set age to 60
    const ageInput = page.locator('.one-time-inflow-row input[type="number"]').first();
    // Use the last added row's age field
    const inflowRows = page.locator('.one-time-inflow-row');
    const lastRow = inflowRows.last();
    const lastAgeInput = lastRow.locator('input[type="number"]').first();
    await lastAgeInput.fill('60');
    await lastAgeInput.blur();

    // Set taxable account to 500000
    const taxableInput = lastRow.locator('input[type="number"]').nth(2);
    await taxableInput.fill('500000');
    await taxableInput.blur();

    await page.waitForTimeout(300); // let state settle

    const totalAfter = await totalCellBefore.innerText();

    // Portfolio at age 60 should be higher after inflow
    expect(parse(totalAfter)).toBeGreaterThan(parse(totalBefore));
  });

  test('adding an outflow decreases portfolio in the target year', async ({ page }) => {
    // Open One-Time Outflows panel
    await page.locator('text=One-Time Outflows').click();
    await page.waitForTimeout(200);

    // Open Year-over-Year Detail
    await page.locator('text=Year-over-Year Detail').click();
    await page.waitForSelector('.year-table tbody tr', { timeout: 5000 });
    await page.waitForSelector('#totalModeSelect', { timeout: 30000 });
    await page.locator('#totalModeSelect').selectOption('deterministic');

    // Find row for age 65
    const rows = page.locator('.year-table tbody tr');
    const rowCount = await rows.count();
    let targetRow = null;
    for (let i = 0; i < rowCount; i++) {
      const cells = rows.nth(i).locator(':scope > td');
      const ageText = await cells.nth(1).innerText();
      if (ageText.trim() === '65') {
        targetRow = rows.nth(i);
        break;
      }
    }
    expect(targetRow).not.toBeNull();

    const totalCellBefore = targetRow.locator(':scope > td').nth(7);
    const totalBefore = await totalCellBefore.innerText();

    const parse = s => {
      const str = s.trim().replace(/[$,]/g, '');
      if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
      if (str.endsWith('K')) return parseFloat(str) * 1_000;
      return parseFloat(str);
    };

    // Add a $200K outflow at age 65
    await page.locator('button.btn-add', { hasText: '+ Add Outflow' }).click();
    await page.waitForTimeout(100);

    const outflowRows = page.locator('.one-time-outflow-row');
    const lastRow = outflowRows.last();
    const lastAgeInput = lastRow.locator('input[type="number"]').first();
    await lastAgeInput.fill('65');
    await lastAgeInput.blur();

    const amountInput = lastRow.locator('input[type="number"]').nth(1);
    await amountInput.fill('200000');
    await amountInput.blur();

    await page.waitForTimeout(300);

    const totalAfter = await totalCellBefore.innerText();

    // Portfolio at age 65 should be lower after outflow
    expect(parse(totalAfter)).toBeLessThan(parse(totalBefore));
  });
});
```

**Step 2: Add CSS classes to the row wrappers in the components**

The E2E tests use `.one-time-inflow-row` and `.one-time-outflow-row`. Add these classes:

In `OneTimeInflows.jsx`, change `<div key={evt.id} className="spending-phase-row">` to:
```jsx
<div key={evt.id} className="spending-phase-row one-time-inflow-row">
```

In `OneTimeOutflows.jsx`, change `<div key={evt.id} className="spending-phase-row">` to:
```jsx
<div key={evt.id} className="spending-phase-row one-time-outflow-row">
```

**Step 3: Run the E2E tests**

```bash
npm run test:e2e -- --grep "One-time inflow"
```

Expected: Both tests PASS.

**Step 4: Commit**

```bash
git add e2e/oneTimeEvents.spec.js src/components/OneTimeInflows.jsx src/components/OneTimeOutflows.jsx
git commit -m "test: E2E tests for one-time inflow and outflow events"
```

---

### Task 8: Run full test suite and verify

**Step 1: Run all unit tests**

```bash
npm run test
```
Expected: All pass.

**Step 2: Run all E2E tests**

```bash
npm run test:e2e
```
Expected: All pass (existing tests unaffected).

**Step 3: Final commit if any cleanup**

If any small fixes were needed during the run, commit them now.

---

## Summary of files changed

| File | Change |
|------|--------|
| `src/defaultState.js` | Add `oneTimeInflows: []`, `oneTimeOutflows: []` |
| `src/engine/calculator.js` | Add helpers `getInflowsForAge`, `getOutflowForAge`; wire into accumulation + decumulation blocks |
| `src/engine/calculator.test.js` | New `describe` block for event behavior + ledger reconciliation; update `COMPONENT_FIELD_REFS` |
| `src/components/OneTimeInflows.jsx` | New component (create) |
| `src/components/OneTimeOutflows.jsx` | New component (create) |
| `src/App.jsx` | Import + render two new components |
| `e2e/oneTimeEvents.spec.js` | New E2E spec (create) |
