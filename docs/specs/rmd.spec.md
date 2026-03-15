# Module Spec: rmd.js

## Purpose
Compute the IRS Required Minimum Distribution (RMD) for a given pre-tax balance and age.
Uses the IRS Uniform Lifetime Table (SECURE 2.0 version, updated 2022).

## Source
Extracted from `src/engine/calculator.js`:
- `RMD_START_AGE` constant
- `UNIFORM_LIFETIME_TABLE` constant
- `getRmdRequired()` function

---

## Constants

### `RMD_START_AGE = 73`
SECURE 2.0 Act moved the RMD start age from 72 to 73.

### `UNIFORM_LIFETIME_TABLE`
IRS Uniform Lifetime Table (SECURE 2.0 version):
```js
{
  72: 27.4,  73: 26.5,  74: 25.5,  75: 24.6,  76: 23.7,
  77: 22.9,  78: 22.0,  79: 21.1,  80: 20.2,  81: 19.4,
  82: 18.5,  83: 17.7,  84: 16.8,  85: 16.0,  86: 15.2,
  87: 14.4,  88: 13.7,  89: 12.9,  90: 12.2,  91: 11.5,
  92: 10.8,  93: 10.1,  94: 9.5,   95: 8.9,   96: 8.4,
  97: 7.8,   98: 7.3,   99: 6.8,   100: 6.4
}
```

---

## Function

### `getRmdRequired(preTaxBalance, age)`

**Signature:**
```js
getRmdRequired(preTaxBalance: number, age: number): number
```

**Rules:**
- Returns `0` if `age < 73`
- Returns `0` if `preTaxBalance <= 0`
- Age is capped at 100 for table lookup (ages > 100 use factor 6.4)
- RMD = `preTaxBalance / distributionPeriod`
- If age is somehow not in the table (shouldn't happen after cap), default to 6.4

**Test cases:**
| preTaxBalance | age | expected | notes |
|---------------|-----|----------|-------|
| 1,000,000 | 72 | 0 | before start age |
| 1,000,000 | 73 | 37,735.85 | 1000000 / 26.5 |
| 1,000,000 | 80 | 49,504.95 | 1000000 / 20.2 |
| 500,000 | 90 | 40,983.61 | 500000 / 12.2 |
| 500,000 | 100 | 78,125.00 | 500000 / 6.4 |
| 500,000 | 105 | 78,125.00 | age capped at 100 |
| 0 | 75 | 0 | zero balance |
| -100 | 75 | 0 | negative balance |
| 1,000,000 | 0 | 0 | age 0 |

**Precision note:** Results may have floating point imprecision. Tests should use `toBeCloseTo(expected, 2)` (2 decimal places).

---

## What NOT to include
- No enforcement logic (the orchestrator handles forcing the RMD if the withdrawal was insufficient)
- No knowledge of which account type holds pre-tax assets
- No tax calculation

## File location
`engine/modules/rmd.js`
`engine/modules/rmd.test.js`

## Definition of Done
All test cases above pass. `getRmdRequired` exported as named export. `UNIFORM_LIFETIME_TABLE` and `RMD_START_AGE` exported as named constants (other modules may reference them). No external dependencies.
