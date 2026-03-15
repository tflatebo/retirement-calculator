export const ACCOUNT_TYPES = ['cash', 'taxable', 'preTax', 'roth'];

/**
 * Computes ending balance for one account for one year.
 * Ending = openingBalance + sum(inflows) - sum(outflows), floored at 0.
 * Negative field values are treated as 0.
 */
export function applyLedger(openingBalance, inflows = {}, outflows = {}) {
  const safe = (v) => (typeof v === 'number' && v > 0 ? v : 0);

  const totalIn =
    safe(inflows.growth) +
    safe(inflows.contribution) +
    safe(inflows.transferIn);

  const totalOut =
    safe(outflows.withdrawal) +
    safe(outflows.taxesPaid) +
    safe(outflows.transferOut);

  return Math.max(0, openingBalance + totalIn - totalOut);
}

/**
 * Creates a single account object.
 * @param {string} type - one of ACCOUNT_TYPES
 * @param {number} initialBalance - floored at 0
 */
export function createAccount(type, initialBalance) {
  return {
    type,
    balance: Math.max(0, initialBalance),
  };
}

/**
 * Creates all four accounts from a balances map.
 * @param {{ cash, taxable, preTax, roth }} balances
 */
export function createPortfolio({ cash, taxable, preTax, roth }) {
  return {
    cash:    createAccount('cash',    cash),
    taxable: createAccount('taxable', taxable),
    preTax:  createAccount('preTax',  preTax),
    roth:    createAccount('roth',    roth),
  };
}

/**
 * Sums all four account balances.
 * @param {{ cash, taxable, preTax, roth }} portfolio
 */
export function totalBalance(portfolio) {
  return (
    portfolio.cash.balance +
    portfolio.taxable.balance +
    portfolio.preTax.balance +
    portfolio.roth.balance
  );
}
