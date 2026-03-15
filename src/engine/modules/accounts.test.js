import { describe, it, expect } from 'vitest';
import {
  ACCOUNT_TYPES,
  applyLedger,
  createAccount,
  createPortfolio,
  totalBalance,
} from './accounts.js';

describe('ACCOUNT_TYPES', () => {
  it('contains exactly the four expected types', () => {
    expect(ACCOUNT_TYPES).toEqual(['cash', 'taxable', 'preTax', 'roth']);
  });
});

describe('applyLedger', () => {
  it('adds growth to opening balance', () => {
    expect(applyLedger(100000, { growth: 5000 }, {})).toBe(105000);
  });

  it('handles contribution inflow and withdrawal outflow', () => {
    expect(applyLedger(50000, { contribution: 10000 }, { withdrawal: 15000 })).toBe(45000);
  });

  it('sums all inflow fields', () => {
    expect(applyLedger(0, { growth: 1000, contribution: 5000, transferIn: 2000 }, {})).toBe(8000);
  });

  it('subtracts all outflow fields', () => {
    expect(applyLedger(100000, {}, { withdrawal: 30000, taxesPaid: 5000, transferOut: 10000 })).toBe(55000);
  });

  it('floors at zero when outflows exceed balance', () => {
    expect(applyLedger(10000, {}, { withdrawal: 15000 })).toBe(0);
  });

  it('returns opening balance unchanged when both inflows and outflows are empty', () => {
    expect(applyLedger(75000, {}, {})).toBe(75000);
  });

  it('works with zero opening balance and inflows', () => {
    expect(applyLedger(0, { contribution: 5000 }, {})).toBe(5000);
  });

  it('treats negative inflow values as 0', () => {
    expect(applyLedger(10000, { growth: -500 }, {})).toBe(10000);
  });

  it('treats negative outflow values as 0', () => {
    expect(applyLedger(10000, {}, { withdrawal: -500 })).toBe(10000);
  });

  it('handles missing inflow/outflow fields (all optional)', () => {
    expect(applyLedger(20000, { growth: 1000 }, { taxesPaid: 200 })).toBe(20800);
  });
});

describe('createAccount', () => {
  it('creates a cash account with positive balance', () => {
    expect(createAccount('cash', 50000)).toEqual({ type: 'cash', balance: 50000 });
  });

  it('creates a roth account with zero balance', () => {
    expect(createAccount('roth', 0)).toEqual({ type: 'roth', balance: 0 });
  });

  it('floors negative initial balance to 0', () => {
    expect(createAccount('preTax', -1000)).toEqual({ type: 'preTax', balance: 0 });
  });

  it('creates a taxable account', () => {
    expect(createAccount('taxable', 75000)).toEqual({ type: 'taxable', balance: 75000 });
  });
});

describe('createPortfolio', () => {
  it('creates all four accounts from a balances object', () => {
    expect(createPortfolio({ cash: 10000, taxable: 50000, preTax: 200000, roth: 80000 })).toEqual({
      cash:    { type: 'cash',    balance: 10000  },
      taxable: { type: 'taxable', balance: 50000  },
      preTax:  { type: 'preTax',  balance: 200000 },
      roth:    { type: 'roth',    balance: 80000  },
    });
  });

  it('creates a portfolio with all zero balances', () => {
    const p = createPortfolio({ cash: 0, taxable: 0, preTax: 0, roth: 0 });
    expect(p.cash.balance).toBe(0);
    expect(p.roth.balance).toBe(0);
  });
});

describe('totalBalance', () => {
  it('sums all four account balances', () => {
    const portfolio = {
      cash:    { balance: 10000  },
      taxable: { balance: 50000  },
      preTax:  { balance: 200000 },
      roth:    { balance: 80000  },
    };
    expect(totalBalance(portfolio)).toBe(340000);
  });

  it('returns 0 for all-zero portfolio', () => {
    const portfolio = {
      cash:    { balance: 0 },
      taxable: { balance: 0 },
      preTax:  { balance: 0 },
      roth:    { balance: 0 },
    };
    expect(totalBalance(portfolio)).toBe(0);
  });
});
