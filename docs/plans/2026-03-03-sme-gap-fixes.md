# SME Gap Fixes — 10 Financial Planning Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 10 financial planning gaps identified by the CFP/CPA SME review to elevate the retirement calculator from "good supplemental tool" to "solid planning tool."

**Architecture:** Each gap is a self-contained task that modifies `defaultState.js` (schema), `calculator.js` (engine), one or more UI components, and `App.css` (styles). Tasks are ordered by dependency: foundational engine changes first (inflation framework, spouse death, SS split), then independent features, then UI-only changes.

**Tech Stack:** React 19, Vite 7, vanilla CSS, no test framework (build verification only).

**No tests exist in this project** — verification is `npm run build` after each task.

---

## Task 1: Inflation Framework (Gap 7)

**Why first:** Many subsequent tasks (bracket inflation, SS threshold inflation) depend on this infrastructure.

**Files:**
- Modify: `src/defaultState.js`
- Modify: `src/engine/calculator.js`
- Modify: `src/components/GlobalInputs.jsx`

**Step 1: Add `inflationRate` to defaultState.js**

Add after `realReturn: 5.0,`:
```js
inflationRate: 3.0, // annual inflation assumption %
```

**Step 2: Add bracket inflation to calculator.js**

Add a helper function after `getLtcgRate` (after line 149):

```js
/**
 * Inflate bracket thresholds by a cumulative factor.
 * Returns a new brackets array with all `upTo` values scaled.
 */
function inflateBrackets(brackets, factor) {
  return brackets.map(b => b.upTo !== undefined
    ? { upTo: Math.round(b.upTo * factor), rate: b.rate }
    : { rate: b.rate }
  );
}
```

**Step 3: Thread inflation through `runSimulation`**

In the destructured state (line ~178), add:
```js
inflationRate = 3.0,
```

Inside the `for` loop (after `const isAccumulation = ...` around line 223), compute the cumulative inflation factor:
```js
const yearsElapsed = age - startAge;
const inflationFactor = Math.pow(1 + (inflationRate / 100), yearsElapsed);
const yearBracketsMfj = inflateBrackets(FEDERAL_BRACKETS_MFJ, inflationFactor);
const yearBracketsSingle = inflateBrackets(FEDERAL_BRACKETS_SINGLE, inflationFactor);
const yearBrackets = filingStatus === 'single' ? yearBracketsSingle : yearBracketsMfj;
const yearStandardDeduction = Math.round(standardDeduction * inflationFactor);
const yearLtcgBracketsMfj = inflateBrackets(LTCG_BRACKETS_MFJ, inflationFactor);
const yearLtcgBracketsSingle = inflateBrackets(LTCG_BRACKETS_SINGLE, inflationFactor);
const yearLtcgBrackets = filingStatus === 'single' ? yearLtcgBracketsSingle : yearLtcgBracketsMfj;
```

Note: SS provisional income thresholds are NOT inflation-adjusted by law (IRS rules). Keep them fixed.

**Step 4: Replace all references to static brackets/deduction**

Throughout `runSimulation`, replace every occurrence of:
- `calcFederalTax(X, filingStatus)` → `calcFederalTaxWithBrackets(X, yearBrackets)` (new function signature)
- `standardDeduction` → `yearStandardDeduction` (in the computation lines, NOT in the destructuring)
- `getBracketCeiling(rate, filingStatus)` → `getBracketCeilingFromBrackets(rate, yearBrackets)`
- `getLtcgRate(income, filingStatus)` → `getLtcgRateFromBrackets(income, yearLtcgBrackets)`

Refactor the existing functions to accept bracket arrays directly:

```js
function calcFederalTaxWithBrackets(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (bracket.upTo === undefined) {
      tax += Math.max(0, taxableIncome - prev) * bracket.rate;
      break;
    }
    const layerTop = Math.min(taxableIncome, bracket.upTo);
    if (layerTop <= prev) break;
    tax += (layerTop - prev) * bracket.rate;
    prev = bracket.upTo;
    if (taxableIncome <= bracket.upTo) break;
  }
  return tax;
}

function getBracketCeilingFromBrackets(rate, brackets) {
  for (const b of brackets) {
    if (b.rate === rate / 100 && b.upTo) return b.upTo;
  }
  return Infinity;
}

function getLtcgRateFromBrackets(totalIncome, brackets) {
  for (const b of brackets) {
    if (b.upTo === undefined || totalIncome <= b.upTo) return b.rate;
  }
  return 0.20;
}
```

Keep the old `calcFederalTax`, `getBracketCeiling`, `getLtcgRate` wrappers as thin pass-throughs for any remaining call sites outside `runSimulation` (e.g. `computeSummary`).

**Step 5: Add UI field in GlobalInputs.jsx**

After the `realReturn` InputField, add:
```jsx
<InputField
  label="Assumed Inflation Rate %"
  name="inflationRate"
  value={state.inflationRate}
  onChange={updateField}
  min={0} max={10} step={0.5}
  suffix="%"
  helpText="Tax brackets and standard deduction inflate annually by this rate. SS thresholds are fixed by law."
/>
```

**Step 6: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`
Expected: Clean build.

**Step 7: Commit**

```bash
git add src/defaultState.js src/engine/calculator.js src/components/GlobalInputs.jsx
git commit -m "feat: add inflation framework — brackets and deduction inflate annually (Gap 7)"
```

---

## Task 2: Spouse Death Modeling (Gap 2)

**Files:**
- Modify: `src/defaultState.js`
- Modify: `src/engine/calculator.js`
- Modify: `src/components/GlobalInputs.jsx`
- Modify: `src/App.css`

**Step 1: Add new fields to defaultState.js**

```js
spouseDeathAge: null, // null = not modeled; number = person2 death age (person1's age)
spouseDeathSpendingReduction: 20, // % reduction in spending after spouse death
```

**Step 2: Engine changes in calculator.js `runSimulation`**

Destructure the new fields:
```js
spouseDeathAge = null,
spouseDeathSpendingReduction = 20,
```

Inside the year loop, after computing `inflationFactor` and before the accumulation/decumulation branch, determine the effective filing status and deduction for this year:

```js
// Spouse death: after spouseDeathAge, filing status switches to single
const spouseDead = spouseDeathAge != null && age >= spouseDeathAge;
const yearFilingStatus = spouseDead ? 'single' : filingStatus;
const yearBrackets = yearFilingStatus === 'single' ? yearBracketsSingle : yearBracketsMfj;
const yearStandardDeduction = Math.round(
  (yearFilingStatus === 'single'
    ? (filingStatus === 'single' ? standardDeduction : 15000) // if was MFJ, drop to single default
    : standardDeduction
  ) * inflationFactor
);
const yearLtcgBrackets = yearFilingStatus === 'single' ? yearLtcgBracketsSingle : yearLtcgBracketsMfj;
```

Where spending is applied, reduce after spouse death:
```js
let rawAnnualSpend = getAnnualSpend(age, spendingPhases);
if (spouseDead) {
  rawAnnualSpend *= (1 - spouseDeathSpendingReduction / 100);
}
annualSpend = rawAnnualSpend;
```

Pass `yearFilingStatus` instead of `filingStatus` to all tax functions within the year loop.

Also store `yearFilingStatus` in the year snapshot output for the YearTable to potentially display.

**Step 3: UI in GlobalInputs.jsx**

After Person 2's age field and the field-note about Person 2, add:

```jsx
<InputField
  label={`If ${state.person2Name} Passes (${state.person1Name}'s age)`}
  name="spouseDeathAge"
  value={state.spouseDeathAge ?? ''}
  onChange={(field, value) => updateField(field, value === '' ? null : Number(value))}
  min={state.person1Age}
  max={state.endOfPlanAge}
  helpText="Leave blank to skip. If set, models the 'widow penalty': filing status shifts to Single, SS drops to the higher benefit, spending decreases."
/>
{state.spouseDeathAge != null && (
  <InputField
    label="Spending Reduction After Death"
    name="spouseDeathSpendingReduction"
    value={state.spouseDeathSpendingReduction}
    onChange={updateField}
    min={0} max={50} step={5}
    suffix="%"
    helpText="Typical: 20-30%. Spending usually drops but doesn't halve."
  />
)}
```

Note: The `InputField` component may need to handle empty string → null for the `spouseDeathAge` field. Check if it passes `Number('')` = `NaN` and handle appropriately. The onChange wrapper above handles it.

**Step 4: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 5: Commit**

```bash
git add src/defaultState.js src/engine/calculator.js src/components/GlobalInputs.jsx
git commit -m "feat: add spouse death modeling — MFJ→Single shift, spending reduction (Gap 2)"
```

---

## Task 3: Split SS Claiming Ages + Survivor Benefit (Gap 1)

**Depends on:** Task 2 (spouse death)

**Files:**
- Modify: `src/defaultState.js`
- Modify: `src/engine/calculator.js`
- Modify: `src/components/SocialSecurity.jsx`

**Step 1: Schema changes in defaultState.js**

Replace:
```js
ssStartAge: 67,
person1SSMonthly: 2500,
person2SSMonthly: 1800,
```

With:
```js
person1SsStartAge: 67,
person2SsStartAge: 67,
person1SSMonthly: 2500,
person2SSMonthly: 1800,
```

Remove the old `ssStartAge` key.

**Step 2: Engine changes in calculator.js**

In `runSimulation` destructuring, replace `ssStartAge` with:
```js
person1SsStartAge = 67,
person2SsStartAge = 67,
```

Remove the old `ssAnnual` computation outside the loop. Inside the yearly loop (decumulation section), compute SS dynamically:

```js
// Each person's SS starts independently
const person1SsActive = age >= person1SsStartAge;
const person2SsActive = !spouseDead && age >= person2SsStartAge;
// Before spouse death: both benefits. After: survivor keeps higher.
let ssAnnualThisYear = 0;
if (spouseDead) {
  // Survivor benefit: higher of the two
  ssAnnualThisYear = Math.max(person1SSMonthly, person2SSMonthly) * 12;
} else {
  if (person1SsActive) ssAnnualThisYear += person1SSMonthly * 12;
  if (person2SsActive) ssAnnualThisYear += person2SSMonthly * 12;
}
ssIncome = ssAnnualThisYear;
```

Also update `computeSummary` to use the new fields:
- Replace `state.ssStartAge` with `Math.min(state.person1SsStartAge, state.person2SsStartAge)` for the SS offset start
- Replace `ssAnnual` with `(state.person1SSMonthly + state.person2SSMonthly) * 12` (keep same for the rough summary estimate)

**Step 3: Update SocialSecurity.jsx**

Replace the single `ssStartAge` field with two independent fields:

```jsx
<InputField
  label={`${state.person1Name} SS Start Age`}
  name="person1SsStartAge"
  value={state.person1SsStartAge}
  onChange={updateField}
  min={62} max={70}
/>
<InputField
  label={`${state.person2Name} SS Start Age`}
  name="person2SsStartAge"
  value={state.person2SsStartAge}
  onChange={updateField}
  min={62} max={70}
/>
```

Update the summary text:
```jsx
const person1Annual = state.person1SSMonthly * 12;
const person2Annual = state.person2SSMonthly * 12;
const combinedAnnual = person1Annual + person2Annual;
```

And the section-note:
```jsx
<p className="section-note">
  Each person claims independently. After spouse death, survivor keeps the higher benefit.
  Combined: ${combinedMonthly.toLocaleString()}/mo = ${(combinedMonthly * 12).toLocaleString()}/yr
</p>
```

**Step 4: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 5: Commit**

```bash
git add src/defaultState.js src/engine/calculator.js src/components/SocialSecurity.jsx
git commit -m "feat: independent SS claiming ages with survivor benefit (Gap 1)"
```

---

## Task 4: Fix Roth Conversion Bracket Strategy (Gap 3)

**Files:**
- Modify: `src/engine/calculator.js`

**Step 1: Fix bracket room calculation**

In the Roth conversion `bracket` branch (around line 292-304), replace:
```js
const approxSsTaxable = computeTaxableSS(ssIncome, 0, filingStatus);
const currentOrdinary = approxSsTaxable;
```

With a better income estimate that includes expected pre-tax withdrawals:
```js
// Estimate pre-tax withdrawals that will happen this year for spending
const estimatedPreTaxDraw = netSpend > 0 ? Math.min(preTax, netSpend) : 0;
const approxOtherIncome = estimatedPreTaxDraw;
const approxSsTaxable = computeTaxableSS(ssIncome, approxOtherIncome, yearFilingStatus);
const currentOrdinary = approxSsTaxable + approxOtherIncome;
```

This way, the bracket room accounts for the pre-tax income that will actually occur this year.

**Step 2: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 3: Commit**

```bash
git add src/engine/calculator.js
git commit -m "fix: Roth conversion bracket strategy accounts for same-year withdrawals (Gap 3)"
```

---

## Task 5: Cash Return Rate (Gap 4)

**Files:**
- Modify: `src/defaultState.js`
- Modify: `src/engine/calculator.js`
- Modify: `src/components/CashRules.jsx`

**Step 1: Add field to defaultState.js**

After `marketDeclineThreshold: 20,`:
```js
cashReturnRate: 4.0, // annual cash return % (money market / T-bills)
```

**Step 2: Engine changes**

In `runSimulation` destructuring, add:
```js
cashReturnRate = 4.0,
```

In the yearly loop, right before spending logic but after contributions (applies to both accumulation and decumulation), add:
```js
// Cash earns its own return rate
cash *= (1 + cashReturnRate / 100);
```

Place this BEFORE the decumulation spending/withdrawal logic, AFTER account growth. In accumulation, place it after contributions. In decumulation, place it after `const marketDeclined = ...` and before `rmdAmount = ...`.

**Step 3: Update CashRules.jsx**

Add after the `marketDeclineThreshold` field:
```jsx
<InputField
  label="Cash Return Rate"
  name="cashReturnRate"
  value={state.cashReturnRate}
  onChange={updateField}
  min={0} max={10} step={0.5}
  suffix="%"
  helpText="Annual return on cash reserves (money market, T-bills). Set 0 for conservative estimate."
/>
```

Update the help text on `targetCashBufferMonths` to remove the old "cash earns no return" language:
```
"Months of spending to keep in cash reserves. Cash earns the Cash Return Rate above. Any cash remaining at end of plan is included in the projected total."
```

**Step 4: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 5: Commit**

```bash
git add src/defaultState.js src/engine/calculator.js src/components/CashRules.jsx
git commit -m "feat: add cash return rate for money market yield (Gap 4)"
```

---

## Task 6: Stack Cash Replenishment Tax with Spending Withdrawals (Gap 5)

**Files:**
- Modify: `src/engine/calculator.js`

**Step 1: Refactor cash replenishment pre-tax draw**

The key issue: when cash is replenished from pre-tax (lines 574-586), the tax is computed in isolation. Instead, we need to add the refill amount to `preTaxDrawn` so the final tax computation (lines 517-522) covers it.

In the cash replenishment section (~line 574), change the pre-tax branch from the current isolated-tax approach to:

```js
} else if (preTax > 0) {
  // Gross up: we need `needed` net after tax. Use current effective rate as estimate.
  const currentGrossIncome = preTaxDrawn + conversionTaxableAmount;
  const currentTaxableIncome = Math.max(0, currentGrossIncome - yearStandardDeduction);
  const currentTax = calcFederalTaxWithBrackets(currentTaxableIncome, yearBrackets);
  const currentEffRate = currentGrossIncome > 0 ? currentTax / currentGrossIncome : 0;
  const safeRate = Math.min(currentEffRate, 0.99);

  const grossRefill = safeRate < 1 ? needed / (1 - safeRate) : needed;
  const refill = Math.min(preTax, grossRefill);
  preTax -= refill;
  preTaxDrawn += refill; // ← KEY: add to preTaxDrawn so final tax computation covers it
  cash += needed; // Add the net amount needed (actual tax computed in final pass)
}
```

This means the final tax computation at lines 517-522 now includes the refill in `preTaxDrawn`, properly stacking it on top of all other ordinary income.

The existing tax deduction block (lines 544-557) will then handle paying the correct tax from the portfolio.

**Step 2: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 3: Commit**

```bash
git add src/engine/calculator.js
git commit -m "fix: stack cash replenishment pre-tax draw into final tax computation (Gap 5)"
```

---

## Task 7: Fix Bracket Withdrawal Strategy Ordering (Gap 6)

**Files:**
- Modify: `src/engine/calculator.js`
- Modify: `src/components/WithdrawalStrategy.jsx`

**Step 1: Swap Roth and Taxable order in bracket strategy**

In the `bracket` withdrawal strategy (lines 379-446), the current order after cash and before pre-tax is:
1. Roth (lines 406-412)
2. Taxable (lines 415-426)

Swap these so taxable is drawn before Roth:
1. Taxable first (lower LTCG cost)
2. Roth second (preserve tax-free assets)

The block computing `maxRothBeforePreTax` (line 406) should become `maxTaxableBeforePreTax` — the amount of spending beyond what pre-tax can net-cover.

After cash draw and before pre-tax draw:
```js
// Draw from taxable first (LTCG usually cheaper than consuming tax-free Roth)
const shortfallBeyondPreTax = Math.max(0, netSpend - maxPreTaxNet);
if (shortfallBeyondPreTax > 0 && taxable > 0) {
  const taxableUsed = Math.min(taxable, shortfallBeyondPreTax);
  const gainFraction = taxable > taxableBasis
    ? Math.max(0, (taxable - taxableBasis) / taxable)
    : 0;
  const gainAmount = taxableUsed * gainFraction;
  taxableDrawn += taxableUsed;
  taxable -= taxableUsed;
  taxableBasis = Math.max(0, taxableBasis - (taxableUsed * (1 - gainFraction)));
  ltcgGainAmount += gainAmount;
  netSpend -= taxableUsed;
}

// Draw from pre-tax up to bracket ceiling
if (netSpend > 0 && preTax > 0) {
  // ... existing pre-tax block unchanged ...
}

// Remaining shortfall — draw from Roth (preserve as long as possible)
if (netSpend > 0 && roth > 0) {
  const rothUsed = Math.min(roth, netSpend);
  roth -= rothUsed;
  rothDrawn += rothUsed;
  netSpend -= rothUsed;
}
```

Remove the old "Draw from Roth up to shortfall beyond what pre-tax can cover" block.

**Step 2: Update WithdrawalStrategy.jsx description**

Update the `bracket` strategy description:
```js
{
  value: 'bracket',
  title: 'Tax Bracket Filling',
  desc: 'Draws from pre-tax only up to the ceiling of your chosen bracket each year. Taxable brokerage covers the next shortfall; Roth is last. Best for: retirees with large pre-tax balances preparing for RMDs.',
  note: null,
},
```

**Step 3: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 4: Commit**

```bash
git add src/engine/calculator.js src/components/WithdrawalStrategy.jsx
git commit -m "fix: bracket strategy draws taxable before Roth to preserve tax-free assets (Gap 6)"
```

---

## Task 8: Monte Carlo Sigma Input (Gap 8)

**Files:**
- Modify: `src/defaultState.js`
- Modify: `src/engine/calculator.js`
- Modify: `src/components/GlobalInputs.jsx`

**Step 1: Add `mcSigma` to defaultState.js**

After `numSimulations: 1000,`:
```js
mcSigma: 12.0, // portfolio volatility (annualized std dev, %)
```

**Step 2: Engine changes**

In `runMonteCarlo`, replace:
```js
const sigma = MONTE_CARLO_SIGMA;
```
with:
```js
const sigma = (state.mcSigma ?? 12) / 100;
```

Keep `MONTE_CARLO_SIGMA` as a default constant but it's no longer used directly.

**Step 3: UI field in GlobalInputs.jsx**

After the `numSimulations` field and its warning, add:
```jsx
<InputField
  label="Portfolio Volatility (σ)"
  name="mcSigma"
  value={state.mcSigma}
  onChange={updateField}
  min={2} max={30} step={1}
  suffix="%"
  helpText="Annualized standard deviation. 8% = conservative bonds, 12% = balanced 60/40, 17% = aggressive equity."
/>
```

**Step 4: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 5: Commit**

```bash
git add src/defaultState.js src/engine/calculator.js src/components/GlobalInputs.jsx
git commit -m "feat: add portfolio volatility (σ) input for Monte Carlo (Gap 8)"
```

---

## Task 9: Healthcare Cost Modeling (Gap 9)

**Files:**
- Modify: `src/defaultState.js`
- Modify: `src/engine/calculator.js`
- Create: `src/components/HealthcareCosts.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.css`

**Step 1: Add fields to defaultState.js**

```js
healthcareCostMonthly: 1500, // monthly premium/cost before Medicare
healthcareEndAge: 65, // Medicare eligibility
```

**Step 2: Engine changes**

In `runSimulation` destructuring, add:
```js
healthcareCostMonthly = 0,
healthcareEndAge = 65,
```

In the decumulation section, right after computing `annualSpend` (after the spending reduction for spouse death), add healthcare costs:
```js
// Healthcare costs for pre-Medicare years
if (age < healthcareEndAge) {
  annualSpend += healthcareCostMonthly * 12;
}
```

**Step 3: Create HealthcareCosts.jsx**

```jsx
import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

export function HealthcareCosts() {
  const { state, updateField } = useAppState();
  const annualCost = state.healthcareCostMonthly * 12;
  const yearsOfCoverage = Math.max(0, state.healthcareEndAge - state.retirementAge);

  return (
    <CollapsiblePanel title="Healthcare (Pre-Medicare)" defaultOpen={false}>
      <p className="section-note">
        For ages before Medicare eligibility. Include ACA premiums, deductibles, and out-of-pocket costs.
        Enter $0/mo if covered by employer or already on Medicare.
        {yearsOfCoverage > 0 && annualCost > 0 && (
          <> That's {' '}
            <strong>${annualCost.toLocaleString()}/yr</strong> for {yearsOfCoverage} years
            {' '}= <strong>${(annualCost * yearsOfCoverage).toLocaleString()}</strong> total added to spending.
          </>
        )}
      </p>
      <div className="input-grid">
        <InputField
          label="Monthly Healthcare Cost"
          name="healthcareCostMonthly"
          value={state.healthcareCostMonthly}
          onChange={updateField}
          min={0} step={100}
          prefix="$"
          helpText="ACA premiums + deductibles + out-of-pocket for your household."
        />
        <InputField
          label="Healthcare Ends at Age"
          name="healthcareEndAge"
          value={state.healthcareEndAge}
          onChange={updateField}
          min={55} max={75}
          helpText="Typically 65 (Medicare eligibility). Set higher if delaying Medicare."
        />
      </div>
      {state.healthcareCostMonthly > 3000 && (
        <p className="field-warning">
          Over $3,000/mo is unusually high. Verify this includes only premiums and expected costs, not worst-case.
        </p>
      )}
    </CollapsiblePanel>
  );
}
```

**Step 4: Wire into App.jsx**

Add import:
```js
import { HealthcareCosts } from './components/HealthcareCosts';
```

Add `<HealthcareCosts />` in the inputs panel between `<SpendingPhases />` and `<CashRules />` (or after CashRules — it's related to spending):

```jsx
<SpendingPhases />
<HealthcareCosts />
<CashRules />
```

**Step 5: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 6: Commit**

```bash
git add src/defaultState.js src/engine/calculator.js src/components/HealthcareCosts.jsx src/App.jsx
git commit -m "feat: add pre-Medicare healthcare cost modeling (Gap 9)"
```

---

## Task 10: Pension / Annuity Income (Gap 10)

**Files:**
- Modify: `src/defaultState.js`
- Modify: `src/engine/calculator.js`
- Create: `src/components/OtherIncome.jsx`
- Modify: `src/App.jsx`

**Step 1: Add fields to defaultState.js**

```js
pensionIncome: 0, // annual pension/annuity income
pensionStartAge: 65,
pensionCola: 0, // annual cost-of-living adjustment %
```

**Step 2: Engine changes**

In `runSimulation` destructuring, add:
```js
pensionIncome = 0,
pensionStartAge = 65,
pensionCola = 0,
```

In the decumulation section, after the SS income calculation, add pension income:
```js
// Pension/annuity income
let pensionIncomeThisYear = 0;
if (age >= pensionStartAge && pensionIncome > 0) {
  const pensionYears = age - pensionStartAge;
  pensionIncomeThisYear = pensionIncome * Math.pow(1 + pensionCola / 100, pensionYears);
}
```

Pension income offsets spending need (same as SS):
```js
let netSpend = Math.max(0, annualSpend - ssIncome - pensionIncomeThisYear);
```

Pension income is taxable as ordinary income — add it to the ordinary income computation:
```js
const ordinaryIncomePreSS = preTaxDrawn + conversionTaxableAmount + pensionIncomeThisYear;
```

Add `pensionIncomeThisYear` to the year snapshot for display:
```js
pensionIncome: pensionIncomeThisYear,
```

Note: The snapshot field name `pensionIncome` will shadow the destructured parameter. Use a different name like `yearPensionIncome` inside the loop to avoid confusion:
```js
let yearPensionIncome = 0;
// ... compute ...
// In snapshot:
pensionIncome: yearPensionIncome,
```

Also update `computeSummary` to offset pension income from `requiredAtRetirement`, similar to SS:
```js
const pensionStartAge = state.pensionStartAge || 65;
const pensionIncome = state.pensionIncome || 0;
const pensionCola = (state.pensionCola || 0) / 100;
if (pensionIncome > 0) {
  let pensionOffset = 0;
  const pensionOffsetStart = Math.max(pensionStartAge, state.retirementAge);
  for (let pAge = pensionOffsetStart; pAge <= state.endOfPlanAge; pAge++) {
    const pensionYears = pAge - pensionStartAge;
    const yearPension = pensionIncome * Math.pow(1 + pensionCola, pensionYears);
    const discountYears = pAge - state.retirementAge;
    pensionOffset += yearPension / Math.pow(1 + r, discountYears);
  }
  requiredAtRetirement = Math.max(0, requiredAtRetirement - pensionOffset);
}
```

**Step 3: Create OtherIncome.jsx**

```jsx
import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

export function OtherIncome() {
  const { state, updateField } = useAppState();

  if (state.pensionIncome === 0 && !state._showOtherIncome) {
    return (
      <CollapsiblePanel title="Pension / Other Income" defaultOpen={false}>
        <p className="section-note">
          Model pension, annuity, or other fixed income streams.
          Pension income is taxed as ordinary income and offsets required portfolio withdrawals.
        </p>
        <div className="input-grid">
          <InputField
            label="Annual Pension Income"
            name="pensionIncome"
            value={state.pensionIncome}
            onChange={updateField}
            min={0} step={1000}
            prefix="$"
            helpText="Set to $0 if no pension. Taxed as ordinary income."
          />
        </div>
      </CollapsiblePanel>
    );
  }

  return (
    <CollapsiblePanel title="Pension / Other Income" defaultOpen={false}>
      <p className="section-note">
        Pension income is taxed as ordinary income and offsets required portfolio withdrawals.
      </p>
      <div className="input-grid">
        <InputField
          label="Annual Pension Income"
          name="pensionIncome"
          value={state.pensionIncome}
          onChange={updateField}
          min={0} step={1000}
          prefix="$"
          helpText="Set to $0 if no pension. Taxed as ordinary income."
        />
        <InputField
          label="Pension Start Age"
          name="pensionStartAge"
          value={state.pensionStartAge}
          onChange={updateField}
          min={40} max={80}
        />
        <InputField
          label="Pension COLA"
          name="pensionCola"
          value={state.pensionCola}
          onChange={updateField}
          min={0} max={5} step={0.5}
          suffix="%"
          helpText="Annual cost-of-living adjustment. 0% = fixed. 2-3% = typical COLA."
        />
      </div>
    </CollapsiblePanel>
  );
}
```

**Step 4: Wire into App.jsx**

Add import:
```js
import { OtherIncome } from './components/OtherIncome';
```

Add `<OtherIncome />` right after `<SocialSecurity />`:

```jsx
<SocialSecurity />
<OtherIncome />
```

**Step 5: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 6: Commit**

```bash
git add src/defaultState.js src/engine/calculator.js src/components/OtherIncome.jsx src/App.jsx
git commit -m "feat: add pension/annuity income with COLA (Gap 10)"
```

---

## Task 11: Final QA Pass

**Files:** All modified files from Tasks 1-10.

**Step 1: Verify build**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`

**Step 2: Schema completeness check**

- Every field in `defaultState.js` must be read by the engine or a component
- Every field destructured in `runSimulation` must have a default value in the destructuring for backward compatibility
- Every new component must be imported and rendered in `App.jsx`

**Step 3: Edge case review**

- `spouseDeathAge = null` → no effect (skip all spouse-death logic)
- `spouseDeathAge < retirementAge` → spouse dies during accumulation; MFJ→Single from retirement start
- `healthcareEndAge < retirementAge` → no healthcare added (all pre-retirement)
- `pensionIncome = 0` → no pension effect
- `inflationRate = 0` → all brackets stay at 2025 values (same as before this change)
- `cashReturnRate = 0` → same as before
- `mcSigma = 12` → same as before

**Step 4: Fix any issues found**

**Step 5: Final build verification**

Run: `cd /workspaces/alpine/retirement-calculator && npm run build`
Expected: Clean build, no warnings except the chunk size notice.
