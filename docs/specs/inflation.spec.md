# Module Spec: inflation.js

## Purpose
Compute inflation factors and apply them to values and tax bracket arrays.
This is the foundation used by every other module that needs year-adjusted values.

## Source
Partially extracted from `src/engine/calculator.js`:
- `inflateBrackets()` — exists as a named function, extract verbatim
- `inflationFactor()` — **does NOT exist as a named function**. It is computed inline as
  `Math.pow(1 + (inflationRate / 100), yearsElapsed)` inside `runSimulation()`.
  You are CREATING this as a named function, not extracting it.

---

## Functions

### `inflationFactor(rate, yearsElapsed)`
Returns the cumulative inflation multiplier for a given rate and number of years.

**Signature:**
```js
inflationFactor(rate: number, yearsElapsed: number): number
```

**Rules:**
- `rate` is a percentage (e.g. 3.0 means 3%)
- Returns `Math.pow(1 + rate / 100, yearsElapsed)`
- At `yearsElapsed = 0`, always returns `1.0`
- At `rate = 0`, always returns `1.0`

**Test cases:**
| rate | yearsElapsed | expected |
|------|-------------|----------|
| 3.0 | 0 | 1.0 |
| 3.0 | 1 | 1.03 |
| 3.0 | 10 | 1.03^10 ≈ 1.34392 |
| 0.0 | 10 | 1.0 |
| 10.0 | 2 | 1.21 |

---

### `inflateBrackets(brackets, factor)`
Returns a new bracket array with all `upTo` thresholds multiplied by `factor`.
Brackets with no `upTo` (the catch-all top bracket) are left unchanged.

**Signature:**
```js
inflateBrackets(brackets: BracketArray, factor: number): BracketArray
```

**Bracket shape:**
```js
// Normal bracket
{ upTo: 94300, rate: 0.12 }
// Catch-all (top bracket)
{ rate: 0.32 }
```

**Rules:**
- Only `upTo` values are multiplied — `rate` values never change
- `upTo` results are rounded to nearest integer (`Math.round`)
- Catch-all brackets (no `upTo`) pass through unchanged
- Returns a new array — does not mutate input
- `factor = 1.0` returns an equivalent array (same values)

**Test cases:**
```js
// factor = 1.0 → values unchanged
inflateBrackets([{ upTo: 100000, rate: 0.22 }, { rate: 0.32 }], 1.0)
// → [{ upTo: 100000, rate: 0.22 }, { rate: 0.32 }]

// factor = 1.03 → upTo values inflated, catch-all unchanged
inflateBrackets([{ upTo: 100000, rate: 0.22 }, { rate: 0.32 }], 1.03)
// → [{ upTo: 103000, rate: 0.22 }, { rate: 0.32 }]

// Multiple brackets
inflateBrackets([
  { upTo: 23200, rate: 0.10 },
  { upTo: 94300, rate: 0.12 },
  { rate: 0.32 }
], 2.0)
// → [{ upTo: 46400, rate: 0.10 }, { upTo: 188600, rate: 0.12 }, { rate: 0.32 }]

// Rounding: 94300 * 1.03 = 97129.0 → 97129
inflateBrackets([{ upTo: 94300, rate: 0.12 }, { rate: 0.32 }], 1.03)
// → [{ upTo: 97129, rate: 0.12 }, { rate: 0.32 }]
```

---

## What NOT to include
- No bracket constants (those live in `tax-federal.js`)
- No year/age logic (the orchestrator computes `yearsElapsed`)
- No side effects

## File location
`engine/modules/inflation.js`
`engine/modules/inflation.test.js`

## Definition of Done
All test cases above pass. Function is exported as named exports. No external dependencies.
