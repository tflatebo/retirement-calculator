/**
 * Retirement Calculator Engine
 * Handles: accumulation, decumulation, withdrawal sequencing,
 * cash replenishment, Social Security offset, Roth conversions, Monte Carlo,
 * progressive federal tax brackets, RMDs, SS taxation, LTCG rates,
 * and flexible withdrawal strategies.
 */

// 2025 Federal income tax brackets for MFJ and Single
const FEDERAL_BRACKETS_MFJ = [
  { upTo: 23200,  rate: 0.10 },
  { upTo: 94300,  rate: 0.12 },
  { upTo: 201050, rate: 0.22 },
  { upTo: 383900, rate: 0.24 },
  { rate: 0.32 }, // catch-all
];

const FEDERAL_BRACKETS_SINGLE = [
  { upTo: 11600,  rate: 0.10 },
  { upTo: 47150,  rate: 0.12 },
  { upTo: 100525, rate: 0.22 },
  { upTo: 191950, rate: 0.24 },
  { rate: 0.32 }, // catch-all
];

// ─── RMD (Required Minimum Distribution) ────────────────────────────────────

const RMD_START_AGE = 73;

// IRS Uniform Lifetime Table (SECURE 2.0 version)
const UNIFORM_LIFETIME_TABLE = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
  79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
  86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5,  95: 8.9,  96: 8.4,  97: 7.8,  98: 7.3,  99: 6.8,
  100: 6.4
};

function getRmdRequired(preTaxBalance, age) {
  if (age < RMD_START_AGE || preTaxBalance <= 0) return 0;
  const factor = UNIFORM_LIFETIME_TABLE[Math.min(age, 100)] ?? 6.4;
  return preTaxBalance / factor;
}

// ─── Social Security Taxability ──────────────────────────────────────────────

// IRS provisional income thresholds for SS taxation (not inflation-adjusted by law)
const SS_LOWER_THRESHOLD_SINGLE = 25000;
const SS_UPPER_THRESHOLD_SINGLE = 34000;
const SS_LOWER_THRESHOLD_MFJ   = 32000;
const SS_UPPER_THRESHOLD_MFJ   = 44000;
const SS_TAXABLE_TIER1_RATE    = 0.50; // up to 50% of SS taxable in tier 1
const SS_TAXABLE_MAX_RATE      = 0.85; // up to 85% of SS taxable above tier 2

/**
 * Compute how much of annual SS income is taxable as ordinary income.
 * Based on IRS provisional income rules.
 */
function computeTaxableSS(ssAnnual, otherOrdinaryIncome, filingStatus) {
  if (ssAnnual <= 0) return 0;
  const combinedIncome = otherOrdinaryIncome + ssAnnual * SS_TAXABLE_TIER1_RATE;
  const lowerThreshold = filingStatus === 'single' ? SS_LOWER_THRESHOLD_SINGLE : SS_LOWER_THRESHOLD_MFJ;
  const upperThreshold = filingStatus === 'single' ? SS_UPPER_THRESHOLD_SINGLE : SS_UPPER_THRESHOLD_MFJ;
  if (combinedIncome <= lowerThreshold) return 0;
  if (combinedIncome <= upperThreshold)
    return Math.min(
      ssAnnual * SS_TAXABLE_TIER1_RATE,
      (combinedIncome - lowerThreshold) * SS_TAXABLE_TIER1_RATE
    );
  // Tier 2: the carry-over from tier 1 is capped at the tier-1 bandwidth,
  // not the full 50% of SS. IRS: taxable = min(85%*SS,
  //   min(50%*SS, 50%*(upperThreshold-lowerThreshold)) + 85%*(provisional-upperThreshold))
  const tier1Carryover = Math.min(
    ssAnnual * SS_TAXABLE_TIER1_RATE,
    (upperThreshold - lowerThreshold) * SS_TAXABLE_TIER1_RATE
  );
  return Math.min(
    ssAnnual * SS_TAXABLE_MAX_RATE,
    tier1Carryover + (combinedIncome - upperThreshold) * SS_TAXABLE_MAX_RATE
  );
}

// ─── Long-Term Capital Gains ─────────────────────────────────────────────────

// 2025 LTCG rate thresholds
const LTCG_BRACKETS_SINGLE = [
  { upTo: 47025,  rate: 0    },
  { upTo: 518900, rate: 0.15 },
  { rate: 0.20 },
];
const LTCG_BRACKETS_MFJ = [
  { upTo: 94050,  rate: 0    },
  { upTo: 583750, rate: 0.15 },
  { rate: 0.20 },
];

/**
 * Return a new bracket array with all upTo thresholds multiplied by inflationFactor.
 * Used to inflate 2025 tax brackets to the simulation year.
 */
function inflateBrackets(brackets, factor) {
  return brackets.map(b => b.upTo !== undefined
    ? { upTo: Math.round(b.upTo * factor), rate: b.rate }
    : { rate: b.rate }
  );
}

/**
 * Calculate federal income tax using a pre-computed (possibly inflated) bracket array.
 */
function calcFederalTaxWithBrackets(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  let tax = 0, prev = 0;
  for (const bracket of brackets) {
    if (bracket.upTo === undefined) { tax += Math.max(0, taxableIncome - prev) * bracket.rate; break; }
    const layerTop = Math.min(taxableIncome, bracket.upTo);
    if (layerTop <= prev) break;
    tax += (layerTop - prev) * bracket.rate;
    prev = bracket.upTo;
    if (taxableIncome <= bracket.upTo) break;
  }
  return tax;
}

/**
 * Get bracket ceiling from a pre-computed bracket array.
 */
function getBracketCeilingFromBrackets(rate, brackets) {
  for (const b of brackets) { if (b.rate === rate / 100 && b.upTo) return b.upTo; }
  return Infinity;
}

/**
 * Get LTCG rate from a pre-computed LTCG bracket array.
 */
function getLtcgRateFromBrackets(totalIncome, brackets) {
  for (const b of brackets) { if (b.upTo === undefined || totalIncome <= b.upTo) return b.rate; }
  return 0.20;
}

// ─── Spending / Contribution helpers ─────────────────────────────────────────

/**
 * Get the annual spend for a given age from spending phases.
 * Returns 0 if no phase covers that age.
 */
function getAnnualSpend(age, spendingPhases) {
  // endAge is inclusive — phase covers startAge through endAge
  const phase = spendingPhases.find(p => age >= p.startAge && age <= p.endAge);
  return phase ? phase.annualSpend : 0;
}

function getContributions(age, contributionPhases) {
  const phase = contributionPhases.find(p => age >= p.startAge && age <= p.endAge);
  if (!phase) return { preTax: 0, roth: 0, taxable: 0, cash: 0 };
  return { preTax: phase.preTax, roth: phase.roth, taxable: phase.taxable, cash: phase.cash };
}

// ─── Main Simulation ──────────────────────────────────────────────────────────

/**
 * Run a single deterministic simulation year-by-year.
 * @param {object} state - full app state
 * @param {function} returnSampler - function(year) => annual return multiplier (e.g. 1.05)
 * @returns {Array} - array of yearly snapshots
 */
export function runSimulation(state, returnSampler) {
  const {
    person1Age,
    person2Age = person1Age,
    retirementAge,
    endOfPlanAge,
    contributionPhases,
    rothConversionStartAge,
    rothConversionEndAge,
    rothConversionAmount,
    // ssStartAge kept for backward compat; prefer per-person fields
    ssStartAge = 67,
    person1SSMonthly,
    person2SSMonthly,
    targetCashBufferMonths,
    marketDeclineThreshold,
    cashReturnRate = 4.0,
    spendingPhases,
    bondsReturnRate = 2.0,
    stocksAllocationPct = 100,
    // New tax / strategy fields (with defaults for backward compatibility)
    filingStatus = 'mfj',
    standardDeduction = 30000,
    stateTaxRate = 0,
    ssStateExempt = true,
    taxableCostBasis: initialTaxableBasis = 0,
    withdrawalStrategy = 'conventional',
    withdrawalTargetBracket = 22,
    rothConversionStrategy = 'fixed',
    rothConversionTargetBracket = 22,
    rothConversionAnnualCap = 100000,
    // Inflation framework (Task 1)
    inflationRate = 3.0,
    // Spouse death modeling (Task 2)
    spouseDeathAge = null,
    spouseDeathSpendingReduction = 20,
    // Per-person SS start ages (Task 3); fall back to ssStartAge for backward compat
    person1SsStartAge = ssStartAge,
    person2SsStartAge = ssStartAge,
    // Healthcare costs (Task 9)
    healthcareCostMonthly = 0,
    healthcareEndAge = 65,
    // Pension / annuity income (Task 10)
    pensionIncome = 0,
    pensionStartAge = 65,
    pensionCola = 0,
  } = state;

  const stateRate = (stateTaxRate || 0) / 100;

  let cash = state.cashBalance;
  let taxable = state.taxableBalance;
  let preTax = state.preTaxBalance;
  let roth = state.rothBalance;

  // Track cost basis of taxable account separately
  let taxableBasis = Math.min(initialTaxableBasis || 0, taxable);

  const years = [];
  const startAge = person1Age;
  const baseYear = new Date().getFullYear();

  for (let age = startAge; age <= endOfPlanAge; age++) {
    const year = baseYear + (age - startAge);
    const isAccumulation = age < retirementAge;
    const returnMultiplier = returnSampler(age - startAge);

    // ── Inflation-adjusted tax brackets for this year (Task 1) ───────────────
    const yearsElapsed = age - startAge;
    const inflationFactor = Math.pow(1 + (inflationRate / 100), yearsElapsed);
    const yearBracketsMfj = inflateBrackets(FEDERAL_BRACKETS_MFJ, inflationFactor);
    const yearBracketsSingle = inflateBrackets(FEDERAL_BRACKETS_SINGLE, inflationFactor);
    let yearBrackets = filingStatus === 'single' ? yearBracketsSingle : yearBracketsMfj;
    let yearStandardDeduction = Math.round(standardDeduction * inflationFactor);
    const yearLtcgBracketsMfj = inflateBrackets(LTCG_BRACKETS_MFJ, inflationFactor);
    const yearLtcgBracketsSingle = inflateBrackets(LTCG_BRACKETS_SINGLE, inflationFactor);
    let yearLtcgBrackets = filingStatus === 'single' ? yearLtcgBracketsSingle : yearLtcgBracketsMfj;

    // ── Spouse death: shift filing status and benefits (Task 2) ──────────────
    const spouseDead = spouseDeathAge != null && age >= spouseDeathAge;
    const yearFilingStatus = spouseDead ? 'single' : filingStatus;
    if (spouseDead && filingStatus === 'mfj') {
      yearBrackets = yearBracketsSingle;
      yearStandardDeduction = Math.round(15000 * inflationFactor);
      yearLtcgBrackets = yearLtcgBracketsSingle;
    }

    let contributions = 0;
    let annualSpend = 0;
    let ssIncome = 0;
    let yearPensionIncome = 0;
    // Year-level tax tracking outputs
    let rmdAmount = 0;
    let taxableIncome = 0;
    let federalTax = 0;
    let effectiveRate = 0;
    let preTaxWithdrawal = 0;
    let rothConversion = 0;

    // Per-account flow tracking (accumulation defaults — overwritten in decumulation)
    let cashReturn = 0;
    let taxReturn = 0;
    let preTaxReturn = 0;
    let rothReturn = 0;
    let cashContrib = 0;
    let taxableContrib = 0;
    let preTaxContrib = 0;
    let rothContrib = 0;
    let cashDrawn = 0;
    let taxableDrawn = 0;
    let preTaxDrawn = 0;
    let rothDrawn = 0;
    let cashRefill = 0;
    let cashRefillFromPreTaxGross = 0;
    let cashRefillSource = '';
    let taxPaidFromCash = 0;
    let taxPaidFromTaxable = 0;
    let taxPaidFromRoth = 0;
    let ltcgTax = 0;
    let stateTax = 0;
    let totalTaxForSnapshot = 0;
    let rmdForcedCashIn = 0;

    if (isAccumulation) {
      // --- ACCUMULATION PHASE ---
      const preGrowthTaxable = taxable;
      const preGrowthPreTax = preTax;
      const preGrowthRoth = roth;

      taxable *= returnMultiplier;
      preTax *= returnMultiplier;
      roth *= returnMultiplier;
      // Cost basis stays the same; gains are unrealized

      taxReturn = taxable - preGrowthTaxable;
      preTaxReturn = preTax - preGrowthPreTax;
      rothReturn = roth - preGrowthRoth;

      const contrib = getContributions(age, contributionPhases);
      preTax += contrib.preTax;
      roth += contrib.roth;
      taxable += contrib.taxable;
      taxableBasis += contrib.taxable; // contributions add to basis at cost
      cash += contrib.cash;

      preTaxContrib = contrib.preTax;
      rothContrib = contrib.roth;
      taxableContrib = contrib.taxable;
      cashContrib = contrib.cash;

      const cashBeforeReturn = cash;
      cash *= (1 + cashReturnRate / 100);
      cashReturn = cash - cashBeforeReturn;

      contributions = contrib.preTax + contrib.roth + contrib.taxable + contrib.cash;

    } else {
      // --- DECUMULATION PHASE ---

      // Apply Social Security — per-person start ages, survivor benefit (Task 3)
      const person1SsActive = age >= person1SsStartAge;
      // Person 2's actual age differs from person 1's age by the age gap
      const person2ActualAge = age - (person1Age - person2Age);
      const person2SsActive = person2ActualAge >= person2SsStartAge;
      if (spouseDead) {
        // Survivor keeps the higher of the two monthly benefits
        const survivorBenefit = Math.max(person1SSMonthly, person2SSMonthly) * 12;
        ssIncome = person1SsActive ? survivorBenefit : 0;
      } else {
        ssIncome = 0;
        if (person1SsActive) ssIncome += person1SSMonthly * 12;
        if (person2SsActive) ssIncome += person2SSMonthly * 12;
      }

      // Capture pre-growth totals for market decline check
      const preGrowthTotal = cash + taxable + preTax + roth;
      const preGrowthTaxable = taxable;
      const preGrowthPreTax = preTax;
      const preGrowthRoth = roth;

      // Grow investment accounts
      taxable *= returnMultiplier;
      preTax *= returnMultiplier;
      roth *= returnMultiplier;
      // Basis grows proportionally with taxable (unrealized gains expand)
      // Actually basis stays fixed — only the account value grows

      taxReturn = taxable - preGrowthTaxable;
      preTaxReturn = preTax - preGrowthPreTax;
      rothReturn = roth - preGrowthRoth;

      const postGrowthTotal = cash + taxable + preTax + roth;
      const portfolioReturn = preGrowthTotal > 0
        ? (postGrowthTotal - preGrowthTotal) / preGrowthTotal
        : 0;
      const marketDeclined = portfolioReturn < -(marketDeclineThreshold / 100);

      // Apply cash return (money market / T-bill yield on the cash bucket)
      const cashBeforeReturn = cash;
      cash *= (1 + cashReturnRate / 100);
      cashReturn = cash - cashBeforeReturn;

      // ── RMD Calculation ────────────────────────────────────────────────────
      rmdAmount = getRmdRequired(preTax, age);

      let rawAnnualSpend = getAnnualSpend(age, spendingPhases);
      if (spouseDead) {
        rawAnnualSpend *= (1 - spouseDeathSpendingReduction / 100);
      }
      annualSpend = rawAnnualSpend;

      // Healthcare costs before Medicare eligibility (Task 9)
      if (age < healthcareEndAge) {
        annualSpend += healthcareCostMonthly * 12;
      }

      // Pension / annuity income (Task 10)
      if (age >= pensionStartAge && pensionIncome > 0) {
        const pensionYears = age - pensionStartAge;
        yearPensionIncome = pensionIncome * Math.pow(1 + pensionCola / 100, pensionYears);
      }

      // Net spend after SS and pension offset
      let netSpend = Math.max(0, annualSpend - ssIncome - yearPensionIncome);

      // ── Roth Conversion ────────────────────────────────────────────────────
      // Run conversion before spending so we know current ordinary income shape.
      // We'll compute actual tax after all withdrawals are determined.
      let conversionTaxableAmount = 0;

      if (age >= rothConversionStartAge && age <= rothConversionEndAge && preTax > 0) {
        let conversionThisYear = 0;

        if (rothConversionStrategy === 'bracket') {
          // Fill ordinary income up to the target bracket ceiling
          const bracketCeiling = getBracketCeilingFromBrackets(rothConversionTargetBracket, yearBrackets);
          // Estimate pre-tax withdrawals that will happen this year for spending
          const estimatedPreTaxDraw = netSpend > 0 ? Math.min(preTax, netSpend) : 0;
          // Include pension income — it is ordinary income and consumes bracket room
          const approxOtherIncome = estimatedPreTaxDraw + yearPensionIncome;
          const approxSsTaxable = computeTaxableSS(ssIncome, approxOtherIncome, yearFilingStatus);
          const currentOrdinary = approxSsTaxable + approxOtherIncome;
          // getBracketCeilingFromBrackets returns a taxable-income ceiling (after std deduction).
          // To get the gross-income limit we add yearStandardDeduction back.
          const roomInBracket = Math.max(
            0,
            (bracketCeiling + yearStandardDeduction) - currentOrdinary
          );
          conversionThisYear = Math.min(roomInBracket, preTax, rothConversionAnnualCap);
        } else {
          // 'fixed'
          conversionThisYear = Math.min(rothConversionAmount, preTax, rothConversionAnnualCap);
        }

        if (conversionThisYear > 0) {
          preTax -= conversionThisYear;
          roth += conversionThisYear;
          conversionTaxableAmount = conversionThisYear;
          rothConversion = conversionThisYear;
        }
      }

      // ── Withdrawal Strategy ────────────────────────────────────────────────
      // ltcgGainAmount accumulates across all withdrawal blocks so the final LTCG
      // rate is applied once after total income is known (avoids Bug 3 where a 0%
      // rough-pass rate causes gain amounts to be silently discarded).
      let ltcgGainAmount = 0;

      if (withdrawalStrategy === 'proportional' && netSpend > 0) {
        // Draw from each account proportional to its share of investment accounts
        const investTotal = taxable + preTax + roth;
        if (investTotal > 0) {
          const taxableFrac = taxable / investTotal;
          const preTaxFrac = preTax / investTotal;
          const rothFrac = roth / investTotal;

          // First draw from cash
          const cashUsed = Math.min(cash, netSpend);
          cash -= cashUsed;
          cashDrawn += cashUsed;
          netSpend -= cashUsed;

          if (netSpend > 0) {
            // Distribute remaining need proportionally
            // Pre-tax needs to be grossed up — iterative approach
            // Approximate effective rate first, then correct
            const approxOrdIncome = netSpend * preTaxFrac + conversionTaxableAmount;
            const approxTaxable = Math.max(0, approxOrdIncome - yearStandardDeduction);
            const approxTax = calcFederalTaxWithBrackets(approxTaxable, yearBrackets);
            const approxEffRate = approxOrdIncome > 0 ? approxTax / approxOrdIncome : 0;

            const preTaxNeededNet = netSpend * preTaxFrac;
            const grossPreTax = approxEffRate < 1
              ? preTaxNeededNet / (1 - approxEffRate)
              : preTaxNeededNet;

            const actualPreTax = Math.min(preTax, grossPreTax);
            const actualTaxable = Math.min(taxable, netSpend * taxableFrac);
            const actualRoth = Math.min(roth, netSpend * rothFrac);

            preTax -= actualPreTax;
            preTaxDrawn = actualPreTax;

            // LTCG on taxable portion
            if (actualTaxable > 0) {
              const gainFraction = taxable > taxableBasis
                ? Math.max(0, (taxable - taxableBasis) / taxable)
                : 0;
              const gainAmount = actualTaxable * gainFraction;
              taxableDrawn = actualTaxable;
              taxable -= actualTaxable;
              taxableBasis = Math.max(0, taxableBasis - (actualTaxable * (1 - gainFraction)));
              ltcgGainAmount += gainAmount; // rate applied after total income is known
            }

            roth -= actualRoth;
            rothDrawn = actualRoth;
          }
        }

      } else if (withdrawalStrategy === 'bracket' && netSpend > 0) {
        // Draw from Roth/taxable first, then pre-tax only up to bracket ceiling
        const bracketCeiling = getBracketCeilingFromBrackets(withdrawalTargetBracket, yearBrackets);
        // Include pension income — it is ordinary income and consumes bracket room.
        // Approximate SS taxability using pension as the other ordinary income.
        const approxSsTaxable = computeTaxableSS(ssIncome, yearPensionIncome, yearFilingStatus);
        // getBracketCeilingFromBrackets returns a taxable-income ceiling (after std deduction).
        // To get the gross-income limit we add yearStandardDeduction back.
        const maxPreTaxOrdinary = Math.max(
          0,
          (bracketCeiling + yearStandardDeduction) - approxSsTaxable - conversionTaxableAmount - yearPensionIncome
        );
        // Rough effective rate estimate
        const approxTaxOnMax = calcFederalTaxWithBrackets(
          Math.max(0, maxPreTaxOrdinary + approxSsTaxable + conversionTaxableAmount + yearPensionIncome - yearStandardDeduction),
          yearBrackets
        );
        const approxEffRate = (maxPreTaxOrdinary + approxSsTaxable + conversionTaxableAmount + yearPensionIncome) > 0
          ? approxTaxOnMax / (maxPreTaxOrdinary + approxSsTaxable + conversionTaxableAmount + yearPensionIncome)
          : 0;

        const maxPreTaxNet = maxPreTaxOrdinary * (1 - approxEffRate);

        // Draw from cash first
        const cashUsed = Math.min(cash, netSpend);
        cash -= cashUsed;
        cashDrawn += cashUsed;
        netSpend -= cashUsed;

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
          const preTaxNet = Math.min(netSpend, maxPreTaxNet);
          const grossPreTax = approxEffRate < 1
            ? preTaxNet / (1 - approxEffRate)
            : preTaxNet;
          const actualPreTax = Math.min(preTax, grossPreTax);
          preTax -= actualPreTax;
          preTaxDrawn += actualPreTax;
          netSpend -= preTaxNet;
        }

        // Remaining shortfall — draw from Roth (preserve as long as possible)
        if (netSpend > 0 && roth > 0) {
          const rothUsed = Math.min(roth, netSpend);
          roth -= rothUsed;
          rothDrawn += rothUsed;
          netSpend -= rothUsed;
        }

      } else {
        // 'conventional' — original order: cash → taxable → pre-tax → Roth
        const cashUsed = Math.min(cash, netSpend);
        cash -= cashUsed;
        cashDrawn += cashUsed;
        netSpend -= cashUsed;

        if (netSpend > 0 && taxable > 0) {
          const taxableUsed = Math.min(taxable, netSpend);
          const gainFraction = taxable > taxableBasis
            ? Math.max(0, (taxable - taxableBasis) / taxable)
            : 0;
          const gainAmount = taxableUsed * gainFraction;
          taxableDrawn = taxableUsed;
          taxable -= taxableUsed;
          taxableBasis = Math.max(0, taxableBasis - (taxableUsed * (1 - gainFraction)));
          ltcgGainAmount += gainAmount; // rate applied after total income is known
          netSpend -= taxableUsed;
        }

        if (netSpend > 0 && preTax > 0) {
          // Approximate effective rate for gross-up
          const approxOrdIncome = netSpend + conversionTaxableAmount;
          const approxTaxableIncome = Math.max(0, approxOrdIncome - yearStandardDeduction);
          const approxTax = calcFederalTaxWithBrackets(approxTaxableIncome, yearBrackets);
          const approxEffRate = approxOrdIncome > 0 ? approxTax / approxOrdIncome : 0;
          const safeRate = Math.min(approxEffRate, 0.99);

          const grossNeeded = safeRate < 1 ? netSpend / (1 - safeRate) : netSpend;
          const preTaxUsed = Math.min(preTax, grossNeeded);
          preTax -= preTaxUsed;
          preTaxDrawn = preTaxUsed;
          netSpend -= preTaxUsed * (1 - safeRate);
        }

        if (netSpend > 0 && roth > 0) {
          const rothUsed = Math.min(roth, netSpend);
          roth -= rothUsed;
          rothDrawn = rothUsed;
          netSpend -= rothUsed;
        }
      }

      // ── RMD Enforcement ────────────────────────────────────────────────────
      // After normal withdrawals, if pre-tax drawn < RMD required, force the shortfall
      if (rmdAmount > 0 && preTaxDrawn < rmdAmount) {
        const rmdShortfall = rmdAmount - preTaxDrawn;
        const actualForced = Math.min(preTax, rmdShortfall);
        if (actualForced > 0) {
          preTax -= actualForced;
          preTaxDrawn += actualForced;
          // Gross proceeds deposited to cash; final tax computation (below) will
          // include this in ordinary income and deduct the tax from cash.
          cash += actualForced;
          rmdForcedCashIn = actualForced;
        }
      }

      preTaxWithdrawal = preTaxDrawn;

      // ── Final Tax Computation ───────────────────────────────────────────────
      // Ordinary income = pre-tax withdrawals + conversions + taxable SS
      // We use an iterative approach: compute taxable SS based on ordinary income
      const ordinaryIncomePreSS = preTaxDrawn + conversionTaxableAmount + yearPensionIncome;
      const taxableSSAmount = computeTaxableSS(ssIncome, ordinaryIncomePreSS, yearFilingStatus);
      const grossOrdinaryIncome = ordinaryIncomePreSS + taxableSSAmount;

      taxableIncome = Math.max(0, grossOrdinaryIncome - yearStandardDeduction);
      federalTax = calcFederalTaxWithBrackets(taxableIncome, yearBrackets);

      // Compute LTCG tax using actual taxable income (all withdrawals now known).
      // IRS LTCG thresholds apply to taxable income (after std deduction), stacking
      // ordinary taxable income plus the capital-gain amount. Roth withdrawals are
      // tax-free and do not stack; basis-return portions of taxable withdrawals are
      // not gains. Using ltcgGainAmount ensures the correct rate even when the
      // rough-pass income proxy would give 0% (Bug 3 fix preserved).
      const totalIncomeForLtcg = taxableIncome + ltcgGainAmount;
      ltcgTax = ltcgGainAmount * getLtcgRateFromBrackets(totalIncomeForLtcg, yearLtcgBrackets);

      // State income tax on ordinary income
      // SS is exempt if ssStateExempt is true
      const stateOrdinaryIncome = ssStateExempt
        ? ordinaryIncomePreSS  // exclude SS from state tax
        : grossOrdinaryIncome;
      const stateTaxAmount = stateOrdinaryIncome * stateRate;
      stateTax = stateTaxAmount;

      const totalTax = federalTax + ltcgTax + stateTaxAmount;
      totalTaxForSnapshot = totalTax;
      const grossIncome = grossOrdinaryIncome + taxableDrawn + ssIncome;
      effectiveRate = grossIncome > 0 ? federalTax / grossIncome : 0;

      // ── Deduct total taxes from portfolio ──────────────────────────────────
      // Taxes are paid from: cash → taxable → roth (in that order)
      let taxRemaining = totalTax;
      const cashForTax = Math.min(cash, taxRemaining);
      cash -= cashForTax;
      taxPaidFromCash = cashForTax;
      taxRemaining -= cashForTax;
      if (taxRemaining > 0) {
        const taxableForTax = Math.min(taxable, taxRemaining);
        taxable -= taxableForTax;
        taxPaidFromTaxable = taxableForTax;
        taxRemaining -= taxableForTax;
      }
      if (taxRemaining > 0) {
        const rothForTax = Math.min(roth, taxRemaining);
        roth -= rothForTax;
        taxPaidFromRoth = rothForTax;
      }

      // ── Cash Replenishment ─────────────────────────────────────────────────
      const targetCash = (annualSpend / 12) * targetCashBufferMonths;
      if (cash < targetCash && !marketDeclined) {
        const needed = targetCash - cash;

        if (taxable > 0) {
          const refill = Math.min(taxable, needed);
          // Compute LTCG on this refill
          const gainFraction = taxable > taxableBasis
            ? Math.max(0, (taxable - taxableBasis) / taxable)
            : 0;
          taxable -= refill;
          taxableBasis = Math.max(0, taxableBasis - (refill * (1 - gainFraction)));
          // LTCG tax on refill is negligible — already paid in annual tax above (simplified)
          cash += refill;
          cashRefill = refill;
          cashRefillSource = 'taxable';
        } else if (preTax > 0) {
          // Gross up using current effective rate (includes all draws so far)
          const currentGrossIncome = preTaxDrawn + conversionTaxableAmount;
          const currentTaxableIncome = Math.max(0, currentGrossIncome - yearStandardDeduction);
          const currentTax = calcFederalTaxWithBrackets(currentTaxableIncome, yearBrackets);
          const currentEffRate = currentGrossIncome > 0 ? currentTax / currentGrossIncome : 0;
          const safeRate = Math.min(currentEffRate, 0.99);

          const grossRefill = safeRate < 1 ? needed / (1 - safeRate) : needed;
          const refill = Math.min(preTax, grossRefill);
          preTax -= refill;
          preTaxDrawn += refill; // KEY: add to preTaxDrawn so final tax computation covers it
          cash += needed; // Add net amount; actual tax will be deducted in final tax pass
          cashRefill = needed;
          cashRefillFromPreTaxGross = refill;
          cashRefillSource = 'preTax';
        } else if (roth > 0) {
          const refill = Math.min(roth, needed);
          roth -= refill;
          cash += refill;
          cashRefill = refill;
          cashRefillSource = 'roth';
        }
      }

      // Floor accounts at 0
      cash = Math.max(0, cash);
      taxable = Math.max(0, taxable);
      preTax = Math.max(0, preTax);
      roth = Math.max(0, roth);
      taxableBasis = Math.max(0, Math.min(taxableBasis, taxable));
    }

    const total = cash + taxable + preTax + roth;

    years.push({
      year,
      age,
      cash,
      taxable,
      preTax,
      roth,
      total,
      annualSpend,
      contributions,
      ssIncome,
      isAccumulation,
      // New tax detail fields
      rmdAmount,
      taxableIncome,
      federalTax,
      effectiveRate,
      preTaxWithdrawal,
      rothConversion,
      pensionIncome: yearPensionIncome,
      // Per-account flow data (Task: Tooltip support)
      cashReturn,
      taxReturn,
      preTaxReturn,
      rothReturn,
      cashContrib,
      taxableContrib,
      preTaxContrib,
      rothContrib,
      cashDrawn,
      taxableDrawn,
      preTaxDrawn,
      rothDrawn,
      cashRefill,
      cashRefillFromPreTaxGross,
      cashRefillSource,
      taxPaidFromCash,
      taxPaidFromTaxable,
      taxPaidFromRoth,
      ltcgTax,
      stateTax,
      totalTax: totalTaxForSnapshot,
      rmdForcedCashIn,
    });
  }

  return years;
}

/**
 * Compute the blended effective return based on stocks/bonds allocation.
 * stocksAllocationPct% of portfolio earns realReturn, rest earns bondsReturnRate.
 */
function effectiveReturnRate(state) {
  const w = (state.stocksAllocationPct ?? 100) / 100;
  const stockR = state.realReturn / 100;
  const bondR = (state.bondsReturnRate ?? 2.0) / 100;
  return w * stockR + (1 - w) * bondR;
}

/**
 * Deterministic simulation using the blended effective return each year.
 */
export function runDeterministic(state) {
  const r = effectiveReturnRate(state);
  return runSimulation(state, () => 1 + r);
}

/**
 * Fast seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces uniformly distributed values in [0, 1).
 * Using a per-simulation seed ensures the same sequence of returns for a
 * given simulation index regardless of other input changes.
 */
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Lognormal random return sampler.
 * Based on ~12% nominal std dev for 50/20/30 allocation.
 * We work in real returns: adjust mu to hit desired real return.
 * @param {number} mu - lognormal mu parameter
 * @param {number} sigma - lognormal sigma parameter
 * @param {function} rand - seeded PRNG function returning values in [0, 1)
 */
function lognormalReturn(mu, sigma, rand) {
  // Box-Muller transform — clamp u1 away from 0 to prevent Math.log(0) = -Infinity
  const u1 = Math.max(rand(), 1e-10);
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(mu + sigma * z);
}

/**
 * Run Monte Carlo simulation.
 * Returns percentile data by age: { age, p10, p50, p90 }[]
 */
export function runMonteCarlo(state) {
  const { numSimulations } = state;
  if (numSimulations < 1) return [];
  const r = effectiveReturnRate(state);
  const sigma = (state.mcSigma ?? 12) / 100;
  // Lognormal parameterization: mu = log(1+r) - sigma^2/2
  const mu = Math.log(1 + r) - (sigma * sigma) / 2;

  const allRuns = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    const rand = mulberry32(sim + 1);
    const years = runSimulation(state, () => lognormalReturn(mu, sigma, rand));
    allRuns.push(years.map(y => ({
      total: y.total,
      cash: y.cash,
      taxable: y.taxable,
      preTax: y.preTax,
      roth: y.roth,
    })));
  }

  // Get number of years from first run
  const numYears = allRuns[0].length;

  // Compute percentiles per year for total and each account
  const result = [];
  const startAge = state.person1Age;
  const accounts = ['total', 'cash', 'taxable', 'preTax', 'roth'];

  for (let i = 0; i < numYears; i++) {
    const entry = { age: startAge + i };
    for (const acct of accounts) {
      const values = allRuns.map(run => run[i][acct]).sort((a, b) => a - b);
      const prefix = acct === 'total' ? '' : acct + '_';
      entry[prefix + 'p10'] = percentile(values, 10);
      entry[prefix + 'p50'] = percentile(values, 50);
      entry[prefix + 'p90'] = percentile(values, 90);
    }
    result.push(entry);
  }

  return result;
}

function percentile(sortedArr, p) {
  const idx = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (idx - lower);
}

/**
 * Compute summary stats from deterministic run + Monte Carlo.
 */
export function computeSummary(state, deterministicYears, monteCarloData) {
  const retirementRow = state.person1Age >= state.retirementAge
    ? deterministicYears.find(y => y.age === state.retirementAge)
    : deterministicYears.find(y => y.age === state.retirementAge - 1 && y.isAccumulation);
  const endRow = deterministicYears.find(y => y.age === state.endOfPlanAge);
  const mcLookupAge = state.person1Age >= state.retirementAge ? state.retirementAge : state.retirementAge - 1;
  const mcRetirement = monteCarloData.find(d => d.age === mcLookupAge);
  const mcEnd = monteCarloData.find(d => d.age === state.endOfPlanAge);

  const totalToday = state.cashBalance + state.taxableBalance + state.preTaxBalance + state.rothBalance;
  const projectedAtRetirement = mcRetirement ? mcRetirement.p50 : (retirementRow ? retirementRow.total : 0);
  const projectedAtEnd = mcEnd ? mcEnd.p50 : (endRow ? endRow.total : 0);

  // "Enough number": rough estimate of what you need at retirement
  // Sum of PV of all spending phases starting from retirement
  let requiredAtRetirement = 0;
  const r = effectiveReturnRate(state);
  state.spendingPhases.forEach(phase => {
    const phaseYears = phase.endAge - phase.startAge + 1;
    const yearsFromRetirement = phase.startAge - state.retirementAge;
    for (let y = 0; y < phaseYears; y++) {
      const discountYears = yearsFromRetirement + y;
      // Skip years before retirement — negative discountYears produce
      // future values instead of present values, inflating requiredAtRetirement.
      if (discountYears < 0) continue;
      requiredAtRetirement += phase.annualSpend / Math.pow(1 + r, discountYears);
    }
  });

  // Offset SS income from required
  const ssAnnual = (state.person1SSMonthly + state.person2SSMonthly) * 12;
  let ssOffset = 0;
  // Start SS offset only from whichever is later: earliest SS start age or retirementAge.
  const earliestSsStartAge = Math.min(
    state.person1SsStartAge ?? state.ssStartAge ?? 67,
    state.person2SsStartAge ?? state.ssStartAge ?? 67
  );
  const ssOffsetStartAge = Math.max(earliestSsStartAge, state.retirementAge);
  for (let ssAge = ssOffsetStartAge; ssAge <= state.endOfPlanAge; ssAge++) {
    const discountYears = ssAge - state.retirementAge;
    ssOffset += ssAnnual / Math.pow(1 + r, discountYears);
  }
  requiredAtRetirement = Math.max(0, requiredAtRetirement - ssOffset);

  // Pension/annuity offset
  const pIncome = state.pensionIncome || 0;
  const pStartAge = state.pensionStartAge || 65;
  const pCola = (state.pensionCola || 0) / 100;
  if (pIncome > 0) {
    let pensionOffset = 0;
    const pensionOffsetStart = Math.max(pStartAge, state.retirementAge);
    for (let pAge = pensionOffsetStart; pAge <= state.endOfPlanAge; pAge++) {
      const pensionYears = pAge - pStartAge;
      const yearPension = pIncome * Math.pow(1 + pCola, pensionYears);
      const discountYears = pAge - state.retirementAge;
      pensionOffset += yearPension / Math.pow(1 + r, discountYears);
    }
    requiredAtRetirement = Math.max(0, requiredAtRetirement - pensionOffset);
  }

  return {
    totalToday,
    projectedAtRetirement,
    projectedAtEnd,
    requiredAtRetirement,
    onTrack: projectedAtRetirement >= requiredAtRetirement,
  };
}
