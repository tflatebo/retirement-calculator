# Module Spec: accounts.js

## Purpose
Define the four account types and provide a pure ledger function that computes
ending balance from opening balance + labeled inflows − labeled outflows.

No tax logic. No growth logic. No strategies.
Just: opening + inflows − outflows = ending.

This is the data foundation everything else builds on.

---

## The Four Accounts

```js
const ACCOUNT_TYPES = ['cash', 'taxable', 'preTax', 'roth'];
```

Each account tracks the same shape:

```js
{
  type: 'cash' | 'taxable' | 'preTax' | 'roth',
  balance: number   // current balance, always >= 0
}
```

---

## Ledger Entry Shape

Each year, each account receives a set of labeled inflows and outflows.
Labels exist for traceability — so we know *why* a balance changed.

```js
// Inflows (add to balance)
{
  growth:        number,  // investment return / interest earned
  contribution:  number,  // new money deposited
  transferIn:    number,  // money moved in from another account (e.g. Roth conversion)
}

// Outflows (subtract from balance)
{
  withdrawal:    number,  // money spent / drawn for living expenses
  taxesPaid:     number,  // taxes deducted from this account
  transferOut:   number,  // money moved out to another account
}
```

All inflow/outflow values are **non-negative numbers**.
Negative values are an error and should be treated as 0.

---

## Functions

### `applyLedger(openingBalance, inflows, outflows)`

Computes the ending balance for one account for one year.

**Signature:**
```js
applyLedger(
  openingBalance: number,
  inflows: { growth?, contribution?, transferIn? },
  outflows: { withdrawal?, taxesPaid?, transferOut? }
): number
```

**Rules:**
- All inflow/outflow fields are optional — missing fields default to 0
- Ending balance = openingBalance + sum(inflows) − sum(outflows)
- **Ending balance is floored at 0** — accounts can't go negative
- Negative input values are treated as 0 (defensive)
- Returns a number, not an object

**Test cases:**
```js
// Basic: opening + growth
applyLedger(100000, { growth: 5000 }, {})
// → 105000

// Opening + contribution - withdrawal
applyLedger(50000, { contribution: 10000 }, { withdrawal: 15000 })
// → 45000

// All inflows
applyLedger(0, { growth: 1000, contribution: 5000, transferIn: 2000 }, {})
// → 8000

// All outflows
applyLedger(100000, {}, { withdrawal: 30000, taxesPaid: 5000, transferOut: 10000 })
// → 55000

// Floor at zero — outflows exceed balance
applyLedger(10000, {}, { withdrawal: 15000 })
// → 0  (not -5000)

// Empty inflows and outflows — balance unchanged
applyLedger(75000, {}, {})
// → 75000

// Zero opening balance, some inflows
applyLedger(0, { contribution: 5000 }, {})
// → 5000

// Negative inflow value treated as 0
applyLedger(10000, { growth: -500 }, {})
// → 10000  (not 9500)
```

---

### `createAccount(type, initialBalance)`

Creates a new account object.

**Signature:**
```js
createAccount(type: string, initialBalance: number): Account
```

**Rules:**
- `type` must be one of: `'cash'`, `'taxable'`, `'preTax'`, `'roth'`
- `initialBalance` must be >= 0; negative values default to 0
- Returns `{ type, balance }`

**Test cases:**
```js
createAccount('cash', 50000)
// → { type: 'cash', balance: 50000 }

createAccount('roth', 0)
// → { type: 'roth', balance: 0 }

createAccount('preTax', -1000)
// → { type: 'preTax', balance: 0 }  (negative floored)
```

---

### `createPortfolio(balances)`

Creates all four accounts at once from a balances object.

**Signature:**
```js
createPortfolio({
  cash: number,
  taxable: number,
  preTax: number,
  roth: number
}): { cash: Account, taxable: Account, preTax: Account, roth: Account }
```

**Test cases:**
```js
createPortfolio({ cash: 10000, taxable: 50000, preTax: 200000, roth: 80000 })
// → {
//     cash:    { type: 'cash',    balance: 10000  },
//     taxable: { type: 'taxable', balance: 50000  },
//     preTax:  { type: 'preTax',  balance: 200000 },
//     roth:    { type: 'roth',    balance: 80000  }
//   }

// Total balance helper
totalBalance(portfolio) → 340000
```

---

### `totalBalance(portfolio)`

Sums all four account balances.

**Signature:**
```js
totalBalance(portfolio: Portfolio): number
```

**Test cases:**
```js
totalBalance({ cash: { balance: 10000 }, taxable: { balance: 50000 }, preTax: { balance: 200000 }, roth: { balance: 80000 } })
// → 340000

totalBalance({ cash: { balance: 0 }, taxable: { balance: 0 }, preTax: { balance: 0 }, roth: { balance: 0 } })
// → 0
```

---

## What NOT to include
- No tax calculations
- No withdrawal strategy logic
- No growth/return calculations
- No knowledge of age, phases, or simulation years
- No state management — these are pure functions on plain data

## File location
`src/engine/modules/accounts.js`
`src/engine/modules/accounts.test.js`

## Definition of Done
All test cases above pass. All four functions exported as named exports. No external dependencies.
