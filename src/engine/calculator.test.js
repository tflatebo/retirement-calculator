/**
 * Tests to ensure DEFAULT_STATE stays in sync with all consumers:
 * the engine (calculator.js) and every component that reads state.X.
 *
 * The bug this prevents: a field gets renamed in defaultState.js but
 * a component still references the old name (e.g. state.ssStartAge
 * after it was split into person1SsStartAge / person2SsStartAge),
 * producing undefined at runtime and crashing the UI silently.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../defaultState.js';
import { runDeterministic, runMonteCarlo, computeSummary } from './calculator.js';

// ─── Engine integration ──────────────────────────────────────────────────────

describe('engine runs cleanly with DEFAULT_STATE', () => {
  it('runDeterministic produces yearly snapshots with no NaN values', () => {
    const years = runDeterministic(DEFAULT_STATE);

    expect(years.length).toBeGreaterThan(0);
    expect(years.length).toBe(DEFAULT_STATE.endOfPlanAge - DEFAULT_STATE.person1Age + 1);

    for (const y of years) {
      expect(y.age).toBeGreaterThanOrEqual(DEFAULT_STATE.person1Age);
      expect(Number.isFinite(y.total)).toBe(true);
      expect(Number.isFinite(y.cash)).toBe(true);
      expect(Number.isFinite(y.taxable)).toBe(true);
      expect(Number.isFinite(y.preTax)).toBe(true);
      expect(Number.isFinite(y.roth)).toBe(true);
      expect(Number.isFinite(y.annualSpend)).toBe(true);
      expect(Number.isFinite(y.ssIncome)).toBe(true);
      expect(Number.isFinite(y.federalTax)).toBe(true);
      expect(Number.isFinite(y.taxableIncome)).toBe(true);
      expect(Number.isFinite(y.effectiveRate)).toBe(true);
      expect(Number.isFinite(y.rmdAmount)).toBe(true);
      expect(Number.isFinite(y.preTaxWithdrawal)).toBe(true);
      expect(Number.isFinite(y.rothConversion)).toBe(true);
    }
  });

  it('runMonteCarlo produces percentile data with no NaN values', () => {
    const mcState = { ...DEFAULT_STATE, numSimulations: 10 }; // small for speed
    const mcData = runMonteCarlo(mcState);

    expect(mcData.length).toBeGreaterThan(0);

    for (const d of mcData) {
      expect(Number.isFinite(d.age)).toBe(true);
      expect(Number.isFinite(d.p10)).toBe(true);
      expect(Number.isFinite(d.p50)).toBe(true);
      expect(Number.isFinite(d.p90)).toBe(true);
      expect(d.p10).toBeLessThanOrEqual(d.p50);
      expect(d.p50).toBeLessThanOrEqual(d.p90);
    }
  });

  it('computeSummary produces finite results', () => {
    const years = runDeterministic(DEFAULT_STATE);
    const mcState = { ...DEFAULT_STATE, numSimulations: 10 };
    const mcData = runMonteCarlo(mcState);
    const summary = computeSummary(DEFAULT_STATE, years, mcData);

    expect(summary).toBeDefined();
    expect(Number.isFinite(summary.totalToday)).toBe(true);
    expect(Number.isFinite(summary.projectedAtRetirement)).toBe(true);
    expect(Number.isFinite(summary.projectedAtEnd)).toBe(true);
    expect(Number.isFinite(summary.requiredAtRetirement)).toBe(true);
    expect(typeof summary.onTrack).toBe('boolean');
  });

  it('all account balances stay non-negative', () => {
    const years = runDeterministic(DEFAULT_STATE);

    for (const y of years) {
      expect(y.cash).toBeGreaterThanOrEqual(0);
      expect(y.taxable).toBeGreaterThanOrEqual(0);
      expect(y.preTax).toBeGreaterThanOrEqual(0);
      expect(y.roth).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Schema field coverage ───────────────────────────────────────────────────

describe('DEFAULT_STATE schema completeness', () => {
  // These are the fields that components access via state.X — extracted from
  // grepping all JSX files. If a field is renamed in defaultState.js, this
  // test fails, catching the exact bug that broke MainChart.jsx.
  const COMPONENT_FIELD_REFS = [
    // MainChart.jsx
    'spendingPhases',
    'retirementAge',
    'person1SsStartAge',
    'person2SsStartAge',
    // TopStrip.jsx
    'person1Age',
    'endOfPlanAge',
    // SocialSecurity.jsx
    'person1SSMonthly',
    'person2SSMonthly',
    'person1Name',
    'person2Name',
    // GlobalInputs.jsx
    'person2Age',
    'spouseDeathAge',
    'spouseDeathSpendingReduction',
    'realReturn',
    'bondsReturnRate',
    'stocksAllocationPct',
    'inflationRate',
    'numSimulations',
    'mcSigma',
    // TaxInputs.jsx
    'filingStatus',
    'standardDeduction',
    'stateTaxRate',
    'ssStateExempt',
    'rothConversionStrategy',
    'rothConversionStartAge',
    'rothConversionEndAge',
    'rothConversionAmount',
    'rothConversionTargetBracket',
    'rothConversionAnnualCap',
    // WithdrawalStrategy.jsx
    'withdrawalStrategy',
    'withdrawalTargetBracket',
    // AccountBalances.jsx
    'cashBalance',
    'taxableBalance',
    'preTaxBalance',
    'rothBalance',
    'taxableCostBasis',
    // CashRules.jsx
    'targetCashBufferMonths',
    'marketDeclineThreshold',
    'cashReturnRate',
    // HealthcareCosts.jsx
    'healthcareCostMonthly',
    'healthcareEndAge',
    // OtherIncome.jsx
    'pensionIncome',
    'pensionStartAge',
    'pensionCola',
    // SpendingPhases.jsx
    'spendingPhases',
    // ContributionPhases.jsx
    'contributionPhases',
  ];

  it('every field referenced by components exists in DEFAULT_STATE', () => {
    const stateKeys = new Set(Object.keys(DEFAULT_STATE));
    const missing = COMPONENT_FIELD_REFS.filter(f => !stateKeys.has(f));

    expect(missing).toEqual([]);
  });

  it('DEFAULT_STATE fields are not undefined or NaN (except nullable fields)', () => {
    const NULLABLE_FIELDS = ['spouseDeathAge'];

    for (const [key, value] of Object.entries(DEFAULT_STATE)) {
      if (NULLABLE_FIELDS.includes(key)) {
        // Nullable fields can be null but not undefined
        expect(value !== undefined, `${key} should not be undefined`).toBe(true);
        continue;
      }
      expect(value !== undefined, `${key} should not be undefined`).toBe(true);
      expect(value !== null, `${key} should not be null (add to NULLABLE_FIELDS if intentional)`).toBe(true);
      if (typeof value === 'number') {
        expect(Number.isFinite(value), `${key} should be finite, got ${value}`).toBe(true);
      }
    }
  });
});

// ─── Spouse death modeling ───────────────────────────────────────────────────

describe('spouse death modeling', () => {
  it('spouseDeathAge=null has no effect on results', () => {
    const baseState = { ...DEFAULT_STATE, spouseDeathAge: null };
    const years = runDeterministic(baseState);

    // Should complete without error
    expect(years.length).toBe(DEFAULT_STATE.endOfPlanAge - DEFAULT_STATE.person1Age + 1);

    // All values finite
    for (const y of years) {
      expect(Number.isFinite(y.total)).toBe(true);
    }
  });

  it('spouse death reduces spending and changes tax computation', () => {
    const noDeathState = { ...DEFAULT_STATE, spouseDeathAge: null };
    const deathAt70State = { ...DEFAULT_STATE, spouseDeathAge: 70 };

    const noDeathYears = runDeterministic(noDeathState);
    const deathYears = runDeterministic(deathAt70State);

    // Before death age, results should be identical
    const age69NoDeath = noDeathYears.find(y => y.age === 69);
    const age69Death = deathYears.find(y => y.age === 69);
    expect(age69NoDeath.total).toBe(age69Death.total);

    // After death age, results should differ (higher tax, lower spending)
    const age80NoDeath = noDeathYears.find(y => y.age === 80);
    const age80Death = deathYears.find(y => y.age === 80);
    expect(age80NoDeath.total).not.toBe(age80Death.total);
  });
});

// ─── Split SS claiming ──────────────────────────────────────────────────────

describe('split SS claiming ages', () => {
  it('different claiming ages produce different SS income timelines', () => {
    const earlyClaimState = {
      ...DEFAULT_STATE,
      person1SsStartAge: 62,
      person2SsStartAge: 70,
    };
    const years = runDeterministic(earlyClaimState);

    // At age 65, only person1 should be collecting
    const at65 = years.find(y => y.age === 65);
    expect(at65.ssIncome).toBe(DEFAULT_STATE.person1SSMonthly * 12);

    // At age 70, only person1 is collecting (person2 is only 68 due to 2-year age gap)
    const at70 = years.find(y => y.age === 70);
    expect(at70.ssIncome).toBe(DEFAULT_STATE.person1SSMonthly * 12);

    // At age 72, person2 is 70 and starts collecting too
    const at72 = years.find(y => y.age === 72);
    expect(at72.ssIncome).toBe(
      (DEFAULT_STATE.person1SSMonthly + DEFAULT_STATE.person2SSMonthly) * 12
    );
  });

  it('survivor benefit kicks in after spouse death', () => {
    const state = {
      ...DEFAULT_STATE,
      person1SsStartAge: 62,
      person2SsStartAge: 62,
      spouseDeathAge: 70,
    };
    const years = runDeterministic(state);

    // Before death: both benefits
    const at69 = years.find(y => y.age === 69);
    expect(at69.ssIncome).toBe(
      (DEFAULT_STATE.person1SSMonthly + DEFAULT_STATE.person2SSMonthly) * 12
    );

    // After death: survivor gets max of the two
    const at71 = years.find(y => y.age === 71);
    expect(at71.ssIncome).toBe(
      Math.max(DEFAULT_STATE.person1SSMonthly, DEFAULT_STATE.person2SSMonthly) * 12
    );
  });
});

// ─── Inflation framework ─────────────────────────────────────────────────────

describe('inflation framework', () => {
  it('inflationRate=0 matches pre-inflation behavior', () => {
    const noInflation = { ...DEFAULT_STATE, inflationRate: 0 };
    const years = runDeterministic(noInflation);

    // Should complete without error, all values finite
    for (const y of years) {
      expect(Number.isFinite(y.total)).toBe(true);
      expect(Number.isFinite(y.federalTax)).toBe(true);
    }
  });

  it('higher inflation reduces effective tax burden in later years', () => {
    const lowInflation = { ...DEFAULT_STATE, inflationRate: 0 };
    const highInflation = { ...DEFAULT_STATE, inflationRate: 5 };

    const lowYears = runDeterministic(lowInflation);
    const highYears = runDeterministic(highInflation);

    // At the end of plan, higher inflation means wider brackets → lower tax
    const lastLow = lowYears[lowYears.length - 1];
    const lastHigh = highYears[highYears.length - 1];

    // High inflation should result in more remaining portfolio (lower taxes)
    expect(lastHigh.total).toBeGreaterThan(lastLow.total);
  });
});

// ─── Cash return rate ────────────────────────────────────────────────────────

describe('cash return rate', () => {
  it('cashReturnRate=0 results in less wealth than cashReturnRate=5', () => {
    const noReturn = { ...DEFAULT_STATE, cashReturnRate: 0 };
    const withReturn = { ...DEFAULT_STATE, cashReturnRate: 5 };

    const noReturnYears = runDeterministic(noReturn);
    const withReturnYears = runDeterministic(withReturn);

    const lastNo = noReturnYears[noReturnYears.length - 1];
    const lastWith = withReturnYears[withReturnYears.length - 1];

    expect(lastWith.total).toBeGreaterThan(lastNo.total);
  });
});

// ─── Healthcare costs ────────────────────────────────────────────────────────

describe('healthcare costs', () => {
  it('healthcare costs increase spending before healthcareEndAge', () => {
    const noHealthcare = { ...DEFAULT_STATE, healthcareCostMonthly: 0 };
    const withHealthcare = { ...DEFAULT_STATE, healthcareCostMonthly: 2000 };

    const noYears = runDeterministic(noHealthcare);
    const withYears = runDeterministic(withHealthcare);

    // At age 60 (before Medicare at 65), spending should be higher
    const no60 = noYears.find(y => y.age === 60);
    const with60 = withYears.find(y => y.age === 60);
    expect(with60.annualSpend).toBe(no60.annualSpend + 2000 * 12);

    // At age 70 (after Medicare), spending should be the same
    const no70 = noYears.find(y => y.age === 70);
    const with70 = withYears.find(y => y.age === 70);
    expect(with70.annualSpend).toBe(no70.annualSpend);
  });
});

// ─── RMD enforcement ─────────────────────────────────────────────────────────

describe('RMD enforcement', () => {
  it('rmdAmount is 0 before age 73', () => {
    const years = runDeterministic(DEFAULT_STATE);
    const at72 = years.find(y => y.age === 72);
    if (at72) {
      expect(at72.rmdAmount).toBe(0);
    }
  });

  it('rmdAmount is positive at age 73 when preTax balance exists', () => {
    const years = runDeterministic(DEFAULT_STATE);
    const at73 = years.find(y => y.age === 73);
    if (at73 && at73.preTax > 0) {
      expect(at73.rmdAmount).toBeGreaterThan(0);
    }
  });

  it('preTaxWithdrawal >= rmdAmount in decumulation years with RMDs', () => {
    const years = runDeterministic(DEFAULT_STATE);
    for (const y of years) {
      if (!y.isAccumulation && y.rmdAmount > 0) {
        expect(y.preTaxWithdrawal).toBeGreaterThanOrEqual(y.rmdAmount - 1); // 1-dollar tolerance for floating point
      }
    }
  });
});

// ─── Withdrawal strategies ───────────────────────────────────────────────────

describe('withdrawal strategies', () => {
  it('proportional strategy produces finite results throughout', () => {
    const state = { ...DEFAULT_STATE, withdrawalStrategy: 'proportional' };
    const years = runDeterministic(state);
    for (const y of years) {
      expect(Number.isFinite(y.total)).toBe(true);
      expect(y.cash).toBeGreaterThanOrEqual(0);
      expect(y.taxable).toBeGreaterThanOrEqual(0);
      expect(y.preTax).toBeGreaterThanOrEqual(0);
      expect(y.roth).toBeGreaterThanOrEqual(0);
    }
  });

  it('bracket strategy produces finite results throughout', () => {
    const state = { ...DEFAULT_STATE, withdrawalStrategy: 'bracket', withdrawalTargetBracket: 22 };
    const years = runDeterministic(state);
    for (const y of years) {
      expect(Number.isFinite(y.total)).toBe(true);
      expect(y.cash).toBeGreaterThanOrEqual(0);
    }
  });

  it('conventional strategy produces finite results throughout', () => {
    const state = { ...DEFAULT_STATE, withdrawalStrategy: 'conventional' };
    const years = runDeterministic(state);
    for (const y of years) {
      expect(Number.isFinite(y.total)).toBe(true);
    }
  });

  it('all three strategies have non-negative account balances', () => {
    for (const strategy of ['conventional', 'proportional', 'bracket']) {
      const years = runDeterministic({ ...DEFAULT_STATE, withdrawalStrategy: strategy });
      for (const y of years) {
        expect(y.cash).toBeGreaterThanOrEqual(0);
        expect(y.taxable).toBeGreaterThanOrEqual(0);
        expect(y.preTax).toBeGreaterThanOrEqual(0);
        expect(y.roth).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─── Roth conversion ─────────────────────────────────────────────────────────

describe('Roth conversion', () => {
  it('fixed conversion decreases preTax and increases roth in conversion window', () => {
    const state = {
      ...DEFAULT_STATE,
      rothConversionStrategy: 'fixed',
      rothConversionAmount: 50000,
      rothConversionStartAge: 55,
      rothConversionEndAge: 60,
    };
    const years = runDeterministic(state);
    const at57 = years.find(y => y.age === 57);
    expect(at57.rothConversion).toBeGreaterThan(0);
  });

  it('no conversion occurs outside conversion window', () => {
    const state = {
      ...DEFAULT_STATE,
      rothConversionStrategy: 'fixed',
      rothConversionAmount: 50000,
      rothConversionStartAge: 60,
      rothConversionEndAge: 65,
    };
    const years = runDeterministic(state);
    const at57 = years.find(y => y.age === 57);
    if (at57 && !at57.isAccumulation) {
      expect(at57.rothConversion).toBe(0);
    }
  });

  it('bracket conversion produces finite results', () => {
    const state = {
      ...DEFAULT_STATE,
      rothConversionStrategy: 'bracket',
      rothConversionTargetBracket: 22,
      rothConversionStartAge: 55,
      rothConversionEndAge: 65,
    };
    const years = runDeterministic(state);
    for (const y of years) {
      expect(Number.isFinite(y.rothConversion)).toBe(true);
    }
  });
});

// ─── Federal tax computation ──────────────────────────────────────────────────

describe('federal tax computation', () => {
  it('higher ordinary income leads to higher federal tax', () => {
    // Spend more = more withdrawals = more ordinary income = more tax
    const lowSpend = {
      ...DEFAULT_STATE,
      spendingPhases: [{ id: 1, name: 'Retirement', startAge: 55, endAge: 90, annualSpend: 80000 }],
      person1SSMonthly: 0,
      person2SSMonthly: 0,
    };
    const highSpend = {
      ...DEFAULT_STATE,
      spendingPhases: [{ id: 1, name: 'Retirement', startAge: 55, endAge: 90, annualSpend: 200000 }],
      person1SSMonthly: 0,
      person2SSMonthly: 0,
    };

    const lowYears = runDeterministic(lowSpend);
    const highYears = runDeterministic(highSpend);

    const low65 = lowYears.find(y => y.age === 65);
    const high65 = highYears.find(y => y.age === 65);

    if (low65 && high65) {
      expect(high65.federalTax).toBeGreaterThanOrEqual(low65.federalTax);
    }
  });

  it('state tax rate increases total tax burden', () => {
    const noState = { ...DEFAULT_STATE, stateTaxRate: 0 };
    const withState = { ...DEFAULT_STATE, stateTaxRate: 5 };

    const noYears = runDeterministic(noState);
    const withYears = runDeterministic(withState);

    const last = noYears.length - 1;
    // With state tax, total wealth should be lower (more taxes paid)
    expect(withYears[last].total).toBeLessThan(noYears[last].total);
  });

  it('federal tax is always non-negative', () => {
    const years = runDeterministic(DEFAULT_STATE);
    for (const y of years) {
      expect(y.federalTax).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Per-account ledger accounting ───────────────────────────────────────────

describe('per-account ledger accounting', () => {
  it('preTax ledger balances: opening + flows = ending', () => {
    const years = runDeterministic(DEFAULT_STATE);
    const decumYears = years.filter(y => !y.isAccumulation);

    for (let i = 1; i < decumYears.length; i++) {
      const prev = decumYears[i - 1];
      const curr = decumYears[i];

      const opening = prev.preTax;
      const growth = curr.preTaxReturn;
      const contribs = curr.preTaxContrib || 0;
      const rothConv = curr.rothConversion || 0;
      const spendingDraw = (curr.preTaxDrawn || 0) - (curr.cashRefillFromPreTaxGross || 0);
      const refillGross = curr.cashRefillFromPreTaxGross || 0;
      const computed = opening + growth + contribs - rothConv - spendingDraw - refillGross;

      expect(Math.abs(computed - curr.preTax)).toBeLessThan(1);
    }
  });

  it('cashRefillFromPreTaxGross is tracked separately when source is preTax', () => {
    // Set up a state where cash refill from preTax is likely
    const state = {
      ...DEFAULT_STATE,
      targetCashBufferMonths: 36, // large buffer triggers more refills
      cashBalance: 0,             // start with no cash to force refills
    };
    const years = runDeterministic(state);
    const preTaxRefillYear = years.find(y => !y.isAccumulation && y.cashRefillSource === 'preTax');

    if (preTaxRefillYear) {
      // When source is preTax, cashRefillFromPreTaxGross must be tracked
      expect(preTaxRefillYear.cashRefillFromPreTaxGross).toBeDefined();
      expect(preTaxRefillYear.cashRefillFromPreTaxGross).toBeGreaterThan(0);
      // Gross must be >= net (tax is paid on the gross withdrawal)
      expect(preTaxRefillYear.cashRefillFromPreTaxGross).toBeGreaterThanOrEqual(preTaxRefillYear.cashRefill);
    }
  });

  it('stocks/bonds blended return is used when allocation < 100%', () => {
    const allStocks = { ...DEFAULT_STATE, stocksAllocationPct: 100 };
    const mixed = { ...DEFAULT_STATE, stocksAllocationPct: 60, bondsReturnRate: 1.0 };

    const stocksYears = runDeterministic(allStocks);
    const mixedYears = runDeterministic(mixed);

    // Mixed allocation (lower effective return) should accumulate less wealth
    const lastStocks = stocksYears[stocksYears.length - 1];
    const lastMixed = mixedYears[mixedYears.length - 1];
    expect(lastStocks.total).toBeGreaterThan(lastMixed.total);
  });

  // State designed to trigger forced RMD: SS income covers all spending,
  // so preTaxDrawn = 0 for spending at age 73+ but RMD is still required.
  const forcedRmdState = {
    ...DEFAULT_STATE,
    person1Age: 70,
    retirementAge: 55,
    endOfPlanAge: 85,
    person1SsStartAge: 70,
    person2SsStartAge: 70,
    person1SSMonthly: 4000,  // $48k/year
    person2SSMonthly: 3000,  // $36k/year — total $84k covers all spending
    spendingPhases: [{ id: 1, name: 'Retirement', startAge: 55, endAge: 85, annualSpend: 50000 }],
    preTaxBalance: 2000000,
    cashBalance: 100000,
    taxableBalance: 0,
    rothBalance: 0,
    rothConversionAmount: 0,
    contributionPhases: [],
    targetCashBufferMonths: 1,
  };

  it('cash ledger balances: opening + all flows (including forced RMD proceeds) = ending', () => {
    const years = runDeterministic(forcedRmdState);

    // Verify at least one year has a forced RMD deposit to cash
    const rmdYear = years.find(y => !y.isAccumulation && (y.rmdForcedCashIn || 0) > 0);
    expect(rmdYear).toBeDefined();

    const decumYears = years.filter(y => !y.isAccumulation);
    for (let i = 1; i < decumYears.length; i++) {
      const prev = decumYears[i - 1];
      const curr = decumYears[i];

      const computed =
        prev.cash
        + (curr.cashReturn || 0)
        + (curr.cashContrib || 0)
        + (curr.cashRefill || 0)
        + (curr.rmdForcedCashIn || 0)
        - (curr.cashDrawn || 0)
        - (curr.taxPaidFromCash || 0);

      expect(Math.abs(computed - curr.cash)).toBeLessThan(1);
    }
  });

  it('roth ledger balances: opening + all flows = ending', () => {
    const years = runDeterministic(DEFAULT_STATE);
    const decumYears = years.filter(y => !y.isAccumulation);

    for (let i = 1; i < decumYears.length; i++) {
      const prev = decumYears[i - 1];
      const curr = decumYears[i];

      const cashRefillFromRoth = curr.cashRefillSource === 'roth' ? (curr.cashRefill || 0) : 0;

      const computed =
        prev.roth
        + (curr.rothReturn || 0)
        + (curr.rothContrib || 0)
        + (curr.rothConversion || 0)
        - (curr.rothDrawn || 0)
        - (curr.taxPaidFromRoth || 0)
        - cashRefillFromRoth;

      expect(Math.abs(computed - curr.roth)).toBeLessThan(1);
    }
  });
});

// ─── Pension income ──────────────────────────────────────────────────────────

describe('pension income', () => {
  it('pension income results in higher end-of-plan wealth', () => {
    const noPension = { ...DEFAULT_STATE, pensionIncome: 0 };
    const withPension = { ...DEFAULT_STATE, pensionIncome: 30000, pensionStartAge: 65 };

    const noYears = runDeterministic(noPension);
    const withYears = runDeterministic(withPension);

    // Pension provides additional income → more total wealth at end of plan
    const lastNo = noYears[noYears.length - 1];
    const lastWith = withYears[withYears.length - 1];
    expect(lastWith.total).toBeGreaterThan(lastNo.total);
  });

  it('pension income appears in year snapshot after start age', () => {
    const state = { ...DEFAULT_STATE, pensionIncome: 40000, pensionStartAge: 60 };
    const years = runDeterministic(state);

    const at65 = years.find(y => y.age === 65);
    expect(at65.pensionIncome).toBeGreaterThan(0);

    // Before pension start age, pension income should be 0
    const at58 = years.find(y => y.age === 58);
    expect(at58.pensionIncome).toBe(0);
  });
});
