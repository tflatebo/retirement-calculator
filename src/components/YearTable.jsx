import React, { useState } from 'react';
import { CollapsiblePanel } from './CollapsiblePanel';
import { formatCurrency } from '../utils/format';

function fmtPct(value) {
  if (value == null || value === 0) return '—';
  return (value * 100).toFixed(1) + '%';
}

function fmtCurrOrDash(value) {
  if (value == null || value === 0) return '—';
  return formatCurrency(value, true);
}

/**
 * A single row in a tooltip breakdown table.
 * sign: '+' | '-' | '' (neutral/info)
 */
function TooltipRow({ label, value, sign, isTotal }) {
  const cls = isTotal
    ? 'tooltip-row-total'
    : sign === '+'
    ? 'tooltip-row-positive'
    : sign === '-'
    ? 'tooltip-row-negative'
    : 'tooltip-row-neutral';

  const prefix = sign === '+' ? '+' : sign === '-' ? '−' : '';
  return (
    <tr className={cls}>
      <td className="tooltip-label">{label}</td>
      <td className="tooltip-amount">{prefix}{formatCurrency(Math.abs(value), true)}</td>
    </tr>
  );
}

/**
 * CellTooltip wraps a <td> and shows a positioned popup on hover
 * with per-account inflow/outflow breakdown.
 *
 * children: the content to render inside the <td>
 * rows: array of { label, value, sign, condition } where condition controls visibility
 * endingLabel / endingBalance: the ending total row (always shown last)
 * className: extra class for the <td>
 */
function CellTooltip({ children, rows, endingLabel, endingBalance, className }) {
  const visibleRows = rows.filter(r => r.condition !== false);
  return (
    <td className={`cell-with-tooltip${className ? ' ' + className : ''}`}>
      {children}
      <div className="cell-tooltip">
        <table className="tooltip-table">
          <tbody>
            {visibleRows.map((r, i) => (
              <TooltipRow key={i} label={r.label} value={r.value} sign={r.sign} />
            ))}
            <tr className="tooltip-divider-row">
              <td colSpan={2}><hr className="tooltip-divider" /></td>
            </tr>
            <TooltipRow
              label={endingLabel || 'Ending balance'}
              value={endingBalance}
              sign=""
              isTotal
            />
          </tbody>
        </table>
      </div>
    </td>
  );
}

export function YearTable({ years, mcData, state }) {
  const [showTaxDetail, setShowTaxDetail] = useState(false);
  const [totalMode, setTotalMode] = useState('median'); // 'deterministic' | 'median'

  if (!years || years.length === 0) return null;

  const hasMcData = mcData && mcData.length > 0;

  // Build a lookup from age → MC median (p50) values: balances + all flow fields
  const mcByAge = {};
  if (hasMcData) {
    for (const d of mcData) {
      mcByAge[d.age] = {
        // Account balances
        total: Math.max(0, d.p50),
        cash: Math.max(0, d.cash_p50 ?? 0),
        taxable: Math.max(0, d.taxable_p50 ?? 0),
        preTax: Math.max(0, d.preTax_p50 ?? 0),
        roth: Math.max(0, d.roth_p50 ?? 0),
        // Flow fields — p50 of per-account inflows and outflows
        cashReturn: d.cashReturn_p50 ?? 0,
        taxReturn: d.taxReturn_p50 ?? 0,
        preTaxReturn: d.preTaxReturn_p50 ?? 0,
        rothReturn: d.rothReturn_p50 ?? 0,
        cashContrib: d.cashContrib_p50 ?? 0,
        taxableContrib: d.taxableContrib_p50 ?? 0,
        preTaxContrib: d.preTaxContrib_p50 ?? 0,
        rothContrib: d.rothContrib_p50 ?? 0,
        cashDrawn: d.cashDrawn_p50 ?? 0,
        taxableDrawn: d.taxableDrawn_p50 ?? 0,
        preTaxDrawn: d.preTaxDrawn_p50 ?? 0,
        rothDrawn: d.rothDrawn_p50 ?? 0,
        cashRefill: d.cashRefill_p50 ?? 0,
        cashRefillFromPreTaxGross: d.cashRefillFromPreTaxGross_p50 ?? 0,
        cashRefillFromTaxable: d.cashRefillFromTaxable_p50 ?? 0,
        cashRefillFromRoth: d.cashRefillFromRoth_p50 ?? 0,
        taxPaidFromCash: d.taxPaidFromCash_p50 ?? 0,
        taxPaidFromTaxable: d.taxPaidFromTaxable_p50 ?? 0,
        taxPaidFromRoth: d.taxPaidFromRoth_p50 ?? 0,
        ltcgTax: d.ltcgTax_p50 ?? 0,
        stateTax: d.stateTax_p50 ?? 0,
        federalTax: d.federalTax_p50 ?? 0,
        rmdForcedCashIn: d.rmdForcedCashIn_p50 ?? 0,
        rothConversion: d.rothConversion_p50 ?? 0,
        contributions: d.contributions_p50 ?? 0,
        ssIncome: d.ssIncome_p50 ?? 0,
        pensionIncome: d.pensionIncome_p50 ?? 0,
        annualSpend: d.annualSpend_p50 ?? 0,
      };
    }
  }

  // Build previous-year account lookup for opening balances and net-change
  const prevByAge = {};
  for (let i = 1; i < years.length; i++) {
    prevByAge[years[i].age] = years[i - 1];
  }

  return (
    <CollapsiblePanel title="Year-over-Year Detail" defaultOpen={false}>
      <div className="table-controls">
        <div className="table-control-item">
          <input
            type="checkbox"
            id="taxDetailToggle"
            checked={showTaxDetail}
            onChange={e => setShowTaxDetail(e.target.checked)}
          />
          <label htmlFor="taxDetailToggle">Show tax detail columns</label>
        </div>
        {hasMcData && (
          <div className="table-control-item">
            <label htmlFor="totalModeSelect">Balances: </label>
            <select
              id="totalModeSelect"
              value={totalMode}
              onChange={e => setTotalMode(e.target.value)}
              className="total-mode-select"
            >
              <option value="deterministic">Deterministic</option>
              <option value="median">Median (Monte Carlo)</option>
            </select>
          </div>
        )}
      </div>

      <div className="table-scroll">
        <table className="year-table">
          <caption>Year-by-year portfolio projection</caption>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Age</th>
              <th scope="col">Phase</th>
              <th scope="col" title="Hover cells for inflow/outflow detail">Cash</th>
              <th scope="col" title="Hover cells for inflow/outflow detail">Taxable</th>
              <th scope="col" title="Hover cells for inflow/outflow detail">Pre-Tax</th>
              <th scope="col" title="Hover cells for inflow/outflow detail">Roth</th>
              <th scope="col" title={totalMode === 'median'
                ? 'Monte Carlo median (50th percentile) total portfolio value'
                : 'Sum of all accounts (deterministic, fixed return each year). Hover for cash-flow detail.'
              }>
                Total
              </th>
              <th scope="col">Annual Spend</th>
              <th scope="col">Contributions</th>
              <th scope="col">SS Income</th>
              {showTaxDetail && (
                <>
                  <th
                    scope="col"
                    className="col-tax-detail"
                    title="Required Minimum Distribution — IRS-mandated annual withdrawal from pre-tax accounts starting at age 73."
                  >
                    RMD
                  </th>
                  <th
                    scope="col"
                    className="col-tax-detail"
                    title="Total ordinary income for federal tax purposes this year."
                  >
                    Taxable Income
                  </th>
                  <th
                    scope="col"
                    className="col-tax-detail"
                    title="Estimated federal income tax paid this year, from progressive brackets based on filing status."
                  >
                    Federal Tax
                  </th>
                  <th
                    scope="col"
                    className="col-tax-detail"
                    title="Federal Tax divided by gross income. Lower than marginal rate because brackets apply progressively."
                  >
                    Eff. Rate
                  </th>
                  <th
                    scope="col"
                    className="col-tax-detail"
                    title="Gross pre-tax account withdrawal this year (before tax is withheld)."
                  >
                    Pre-Tax W/D
                  </th>
                  <th
                    scope="col"
                    className="col-tax-detail"
                    title="Amount converted from pre-tax to Roth this year."
                  >
                    Roth Conv.
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {years.map(row => {
              const phase = state.spendingPhases.find(
                p => row.age >= p.startAge && row.age <= p.endAge
              );

              const prevRow = prevByAge[row.age];
              const prevTotal = prevRow?.total;
              const netChange = prevTotal != null ? row.total - prevTotal : null;

              const mc = mcByAge[row.age];
              const prevMc = mcByAge[row.age - 1] ?? null;
              const useMedian = totalMode === 'median' && mc != null;

              // flows: all inflow/outflow values come from either MC p50 or the deterministic row
              const flows = useMedian ? mc : row;

              // display balances for cell content
              const displayCash = useMedian ? mc.cash : row.cash;
              const displayTaxable = useMedian ? mc.taxable : row.taxable;
              const displayPreTax = useMedian ? mc.preTax : row.preTax;
              const displayRoth = useMedian ? mc.roth : row.roth;
              const displayTotal = useMedian ? mc.total : row.total;

              // Opening balances: MC p50 of previous year (median mode) or deterministic previous year
              const openCash = useMedian ? (prevMc?.cash ?? null) : (prevRow?.cash ?? null);
              const openTaxable = useMedian ? (prevMc?.taxable ?? null) : (prevRow?.taxable ?? null);
              const openPreTax = useMedian ? (prevMc?.preTax ?? null) : (prevRow?.preTax ?? null);
              const openRoth = useMedian ? (prevMc?.roth ?? null) : (prevRow?.roth ?? null);

              // Spending-only portion of preTaxDrawn (excludes cash refill gross)
              const preTaxSpending = Math.max(0, (flows.preTaxDrawn ?? 0) - (flows.cashRefillFromPreTaxGross ?? 0));

              // cashRefillSource is a string (det. only); in median mode use numeric split fields
              const cashRefillFromTaxable = useMedian
                ? (mc.cashRefillFromTaxable ?? 0)
                : (row.cashRefillSource === 'taxable' ? (row.cashRefill ?? 0) : 0);
              const cashRefillFromRoth = useMedian
                ? (mc.cashRefillFromRoth ?? 0)
                : (row.cashRefillSource === 'roth' ? (row.cashRefill ?? 0) : 0);

              const cashRows = [
                { label: 'Opening balance', value: openCash, sign: '', condition: openCash != null },
                { label: 'Interest earned', value: flows.cashReturn, sign: '+', condition: (flows.cashReturn ?? 0) > 0 },
                { label: 'Contribution', value: flows.cashContrib, sign: '+', condition: (flows.cashContrib ?? 0) > 0 },
                { label: 'RMD proceeds (gross)', value: flows.rmdForcedCashIn, sign: '+', condition: (flows.rmdForcedCashIn ?? 0) > 0 },
                { label: 'Cash replenishment (in)', value: flows.cashRefill, sign: '+', condition: (flows.cashRefill ?? 0) > 0 },
                { label: 'Spending withdrawal', value: flows.cashDrawn, sign: '-', condition: (flows.cashDrawn ?? 0) > 0 },
                { label: 'Tax payment', value: flows.taxPaidFromCash, sign: '-', condition: (flows.taxPaidFromCash ?? 0) > 0 },
              ];

              const taxableRows = [
                { label: 'Opening balance', value: openTaxable, sign: '', condition: openTaxable != null },
                { label: 'Investment growth', value: flows.taxReturn, sign: (flows.taxReturn ?? 0) >= 0 ? '+' : '-', condition: (flows.taxReturn ?? 0) !== 0 },
                { label: 'Contribution', value: flows.taxableContrib, sign: '+', condition: (flows.taxableContrib ?? 0) > 0 },
                { label: 'Spending withdrawal', value: flows.taxableDrawn, sign: '-', condition: (flows.taxableDrawn ?? 0) > 0 },
                { label: 'Tax payment', value: flows.taxPaidFromTaxable, sign: '-', condition: (flows.taxPaidFromTaxable ?? 0) > 0 },
                { label: 'Cash replenishment (out)', value: cashRefillFromTaxable, sign: '-', condition: cashRefillFromTaxable > 0 },
              ];

              // preTaxDrawn = spending + cashRefillFromPreTaxGross; show each component separately
              const preTaxRows = [
                { label: 'Opening balance', value: openPreTax, sign: '', condition: openPreTax != null },
                { label: 'Investment growth', value: flows.preTaxReturn, sign: (flows.preTaxReturn ?? 0) >= 0 ? '+' : '-', condition: (flows.preTaxReturn ?? 0) !== 0 },
                { label: 'Contribution', value: flows.preTaxContrib, sign: '+', condition: (flows.preTaxContrib ?? 0) > 0 },
                { label: 'Roth conversion (out)', value: flows.rothConversion, sign: '-', condition: (flows.rothConversion ?? 0) > 0 },
                { label: 'Spending withdrawal', value: preTaxSpending, sign: '-', condition: preTaxSpending > 0 },
                { label: 'Cash refill (gross out)', value: flows.cashRefillFromPreTaxGross, sign: '-', condition: (flows.cashRefillFromPreTaxGross ?? 0) > 0 },
              ];

              const rothRows = [
                { label: 'Opening balance', value: openRoth, sign: '', condition: openRoth != null },
                { label: 'Investment growth', value: flows.rothReturn, sign: (flows.rothReturn ?? 0) >= 0 ? '+' : '-', condition: (flows.rothReturn ?? 0) !== 0 },
                { label: 'Contribution', value: flows.rothContrib, sign: '+', condition: (flows.rothContrib ?? 0) > 0 },
                { label: 'Roth conversion (in)', value: flows.rothConversion, sign: '+', condition: (flows.rothConversion ?? 0) > 0 },
                { label: 'Spending withdrawal', value: flows.rothDrawn, sign: '-', condition: (flows.rothDrawn ?? 0) > 0 },
                { label: 'Tax payment', value: flows.taxPaidFromRoth, sign: '-', condition: (flows.taxPaidFromRoth ?? 0) > 0 },
                { label: 'Cash replenishment (out)', value: cashRefillFromRoth, sign: '-', condition: cashRefillFromRoth > 0 },
              ];

              // Total column tooltip rows
              const investReturn = (flows.taxReturn ?? 0) + (flows.preTaxReturn ?? 0) + (flows.rothReturn ?? 0);
              const totalRows = [
                { label: 'Investment returns', value: investReturn, sign: investReturn >= 0 ? '+' : '-', condition: investReturn !== 0 },
                { label: 'Cash interest', value: flows.cashReturn, sign: '+', condition: (flows.cashReturn ?? 0) > 0 },
                { label: 'Contributions', value: flows.contributions, sign: '+', condition: (flows.contributions ?? 0) > 0 },
                { label: 'Social Security', value: flows.ssIncome, sign: '+', condition: (flows.ssIncome ?? 0) > 0 },
                { label: 'Pension income', value: flows.pensionIncome, sign: '+', condition: (flows.pensionIncome ?? 0) > 0 },
                { label: 'Spending', value: flows.annualSpend, sign: '-', condition: (flows.annualSpend ?? 0) > 0 },
                { label: 'Federal tax', value: flows.federalTax, sign: '-', condition: (flows.federalTax ?? 0) > 0 },
                { label: 'LTCG tax', value: flows.ltcgTax, sign: '-', condition: (flows.ltcgTax ?? 0) > 0 },
                { label: 'State tax', value: flows.stateTax, sign: '-', condition: (flows.stateTax ?? 0) > 0 },
              ];

              return (
                <tr key={row.age} className={row.isAccumulation ? 'row-accum' : 'row-decum'}>
                  <td>{row.year}</td>
                  <td>{row.age}</td>
                  <td className="phase-name-cell">
                    {row.isAccumulation ? 'Accumulation' : (phase ? phase.name : '—')}
                  </td>

                  <CellTooltip
                    rows={cashRows}
                    endingLabel={openCash != null ? `Net: ${displayCash - openCash >= 0 ? '+' : ''}${formatCurrency(displayCash - openCash, true)}` : 'Ending balance'}
                    endingBalance={displayCash}
                  >
                    {formatCurrency(displayCash, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={taxableRows}
                    endingLabel={openTaxable != null ? `Net: ${displayTaxable - openTaxable >= 0 ? '+' : ''}${formatCurrency(displayTaxable - openTaxable, true)}` : 'Ending balance'}
                    endingBalance={displayTaxable}
                  >
                    {formatCurrency(displayTaxable, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={preTaxRows}
                    endingLabel={openPreTax != null ? `Net: ${displayPreTax - openPreTax >= 0 ? '+' : ''}${formatCurrency(displayPreTax - openPreTax, true)}` : 'Ending balance'}
                    endingBalance={displayPreTax}
                  >
                    {formatCurrency(displayPreTax, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={rothRows}
                    endingLabel={openRoth != null ? `Net: ${displayRoth - openRoth >= 0 ? '+' : ''}${formatCurrency(displayRoth - openRoth, true)}` : 'Ending balance'}
                    endingBalance={displayRoth}
                  >
                    {formatCurrency(displayRoth, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={totalRows.filter(r => r.condition !== false)}
                    endingLabel={
                      useMedian
                        ? (prevMc != null ? `Net: ${displayTotal - prevMc.total >= 0 ? '+' : ''}${formatCurrency(displayTotal - prevMc.total, true)}` : 'MC Median (p50)')
                        : netChange != null
                          ? `Net change: ${netChange >= 0 ? '+' : ''}${formatCurrency(netChange, true)}`
                          : 'Total'
                    }
                    endingBalance={displayTotal}
                    className="col-total"
                  >
                    {formatCurrency(displayTotal, true)}
                  </CellTooltip>

                  <td>{row.annualSpend > 0 ? formatCurrency(row.annualSpend, true) : '—'}</td>
                  <td>{row.contributions > 0 ? formatCurrency(row.contributions, true) : '—'}</td>
                  <td>{row.ssIncome > 0 ? formatCurrency(row.ssIncome, true) : '—'}</td>
                  {showTaxDetail && (
                    <>
                      <td className="col-tax-detail">{fmtCurrOrDash(row.rmdAmount)}</td>
                      <td className="col-tax-detail">{fmtCurrOrDash(row.taxableIncome)}</td>
                      <td className="col-tax-detail">{fmtCurrOrDash(row.federalTax)}</td>
                      <td className="col-tax-detail">{fmtPct(row.effectiveRate)}</td>
                      <td className="col-tax-detail">{fmtCurrOrDash(row.preTaxWithdrawal)}</td>
                      <td className="col-tax-detail">{fmtCurrOrDash(row.rothConversion)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}
