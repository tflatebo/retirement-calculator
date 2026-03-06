export const DEFAULT_STATE = {
  // Global
  person1Name: 'Person 1',
  person2Name: 'Person 2',
  person1Age: 42,
  person2Age: 40,
  retirementAge: 55,
  endOfPlanAge: 90,
  realReturn: 5.0,
  bondsReturnRate: 2.0,
  stocksAllocationPct: 60,
  inflationRate: 3.0,
  numSimulations: 1000,
  mcSigma: 12.0,

  // Account balances (today)
  cashBalance: 50000,
  taxableBalance: 200000,
  preTaxBalance: 800000,
  rothBalance: 150000,

  // Contribution phases (accumulation only)
  contributionPhases: [
    {
      id: 1,
      name: 'Working years',
      startAge: 42,
      endAge: 54,
      preTax: 30000,
      roth: 16000,
      taxable: 20000,
      cash: 10000,
    }
  ],

  // Tax Configuration
  filingStatus: 'mfj',
  standardDeduction: 30000,
  stateTaxRate: 0,
  ssStateExempt: true,

  // Account cost basis
  taxableCostBasis: 100000, // ~50% of the 200000 taxableBalance default

  // Withdrawal Strategy
  withdrawalStrategy: 'conventional',
  withdrawalTargetBracket: 22,

  // Roth Conversion
  rothConversionStrategy: 'fixed',
  rothConversionStartAge: 55,
  rothConversionEndAge: 65,
  rothConversionAmount: 50000,
  rothConversionTargetBracket: 22,
  rothConversionAnnualCap: 100000,

  // Healthcare (pre-Medicare)
  healthcareCostMonthly: 1500,
  healthcareEndAge: 65,

  // Pension / annuity income
  pensionIncome: 0,
  pensionStartAge: 65,
  pensionCola: 0,

  // Social Security
  person1SsStartAge: 67,
  person2SsStartAge: 67,
  person1SSMonthly: 2500,
  person2SSMonthly: 1800,

  // Spouse death modeling
  spouseDeathAge: null,
  spouseDeathSpendingReduction: 20,

  // Cash replenishment rules
  targetCashBufferMonths: 24,
  marketDeclineThreshold: 20,
  cashReturnRate: 4.0,

  // Spending phases
  spendingPhases: [
    { id: 1, name: 'Early retirement', startAge: 55, endAge: 64, annualSpend: 180000 },
    { id: 2, name: 'Mid retirement', startAge: 65, endAge: 74, annualSpend: 144000 },
    { id: 3, name: 'Later retirement', startAge: 75, endAge: 90, annualSpend: 96000 },
  ],
};
