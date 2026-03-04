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
 * endingBalance: always shown as the last row
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

  // Build a lookup from age → MC median (p50) values per account
  const mcByAge = {};
  if (hasMcData) {
    for (const d of mcData) {
      mcByAge[d.age] = {
        total: Math.max(0, d.p50),
        cash: Math.max(0, d.cash_p50 ?? 0),
        taxable: Math.max(0, d.taxable_p50 ?? 0),
        preTax: Math.max(0, d.preTax_p50 ?? 0),
        roth: Math.max(0, d.roth_p50 ?? 0),
      };
    }
  }

  // Build previous-year total lookup for net-change calculation in total tooltip
  const prevTotalByAge = {};
  for (let i = 1; i < years.length; i++) {
    prevTotalByAge[years[i].age] = years[i - 1].total;
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

              // Destructure flow fields (with safe defaults for older snapshots)
              const {
                cashReturn = 0,
                taxReturn = 0,
                preTaxReturn = 0,
                rothReturn = 0,
                cashContrib = 0,
                taxableContrib = 0,
                preTaxContrib = 0,
                rothContrib = 0,
                cashDrawn = 0,
                taxableDrawn = 0,
                preTaxDrawn = 0,
                rothDrawn = 0,
                cashRefill = 0,
                cashRefillSource = '',
                taxPaidFromCash = 0,
                taxPaidFromTaxable = 0,
                taxPaidFromRoth = 0,
                ltcgTax = 0,
                stateTax = 0,
              } = row;

              const prevTotal = prevTotalByAge[row.age];
              const netChange = prevTotal != null ? row.total - prevTotal : null;

              // Tooltip rows for Cash
              const cashRows = [
                { label: 'Interest earned', value: cashReturn, sign: '+', condition: cashReturn > 0 },
                { label: 'Contribution', value: cashContrib, sign: '+', condition: cashContrib > 0 },
                { label: 'Spending withdrawal', value: cashDrawn, sign: '-', condition: cashDrawn > 0 },
                { label: 'Tax payment', value: taxPaidFromCash, sign: '-', condition: taxPaidFromCash > 0 },
                { label: 'Cash replenishment', value: cashRefill, sign: '+', condition: cashRefill > 0 },
              ];

              // Tooltip rows for Taxable
              const taxableRows = [
                { label: 'Investment growth', value: taxReturn, sign: taxReturn >= 0 ? '+' : '-', condition: taxReturn !== 0 },
                { label: 'Contribution', value: taxableContrib, sign: '+', condition: taxableContrib > 0 },
                { label: 'Spending withdrawal', value: taxableDrawn, sign: '-', condition: taxableDrawn > 0 },
                { label: 'Tax payment', value: taxPaidFromTaxable, sign: '-', condition: taxPaidFromTaxable > 0 },
                { label: 'Cash replenishment (out)', value: cashRefill, sign: '-', condition: cashRefillSource === 'taxable' && cashRefill > 0 },
                { label: 'LTCG tax (embedded)', value: ltcgTax, sign: '-', condition: ltcgTax > 0 },
              ];

              // Tooltip rows for Pre-Tax
              const preTaxRows = [
                { label: 'Investment growth', value: preTaxReturn, sign: preTaxReturn >= 0 ? '+' : '-', condition: preTaxReturn !== 0 },
                { label: 'Contribution', value: preTaxContrib, sign: '+', condition: preTaxContrib > 0 },
                { label: 'Roth conversion (out)', value: row.rothConversion, sign: '-', condition: (row.rothConversion || 0) > 0 },
                { label: 'Spending withdrawal', value: preTaxDrawn, sign: '-', condition: preTaxDrawn > 0 },
                { label: 'Cash replenishment (out)', value: cashRefill, sign: '-', condition: cashRefillSource === 'preTax' && cashRefill > 0 },
              ];

              // Tooltip rows for Roth
              const rothRows = [
                { label: 'Investment growth', value: rothReturn, sign: rothReturn >= 0 ? '+' : '-', condition: rothReturn !== 0 },
                { label: 'Contribution', value: rothContrib, sign: '+', condition: rothContrib > 0 },
                { label: 'Roth conversion (in)', value: row.rothConversion, sign: '+', condition: (row.rothConversion || 0) > 0 },
                { label: 'Spending withdrawal', value: rothDrawn, sign: '-', condition: rothDrawn > 0 },
                { label: 'Tax payment', value: taxPaidFromRoth, sign: '-', condition: taxPaidFromRoth > 0 },
                { label: 'Cash replenishment (out)', value: cashRefill, sign: '-', condition: cashRefillSource === 'roth' && cashRefill > 0 },
              ];

              // Tooltip rows for Total column
              const investReturn = taxReturn + preTaxReturn + rothReturn;
              const totalRows = [
                { label: 'Investment returns', value: investReturn, sign: investReturn >= 0 ? '+' : '-', condition: investReturn !== 0 },
                { label: 'Cash interest', value: cashReturn, sign: '+', condition: cashReturn > 0 },
                { label: 'Contributions', value: row.contributions, sign: '+', condition: (row.contributions || 0) > 0 },
                { label: 'Social Security', value: row.ssIncome, sign: '+', condition: (row.ssIncome || 0) > 0 },
                { label: 'Pension income', value: row.pensionIncome, sign: '+', condition: (row.pensionIncome || 0) > 0 },
                { label: 'Spending', value: row.annualSpend, sign: '-', condition: (row.annualSpend || 0) > 0 },
                { label: 'Federal tax', value: row.federalTax, sign: '-', condition: (row.federalTax || 0) > 0 },
                { label: 'LTCG tax', value: ltcgTax, sign: '-', condition: ltcgTax > 0 },
                { label: 'State tax', value: stateTax, sign: '-', condition: stateTax > 0 },
              ];

              const mc = mcByAge[row.age];
              const useMedian = totalMode === 'median' && mc != null;
              const displayCash = useMedian ? mc.cash : row.cash;
              const displayTaxable = useMedian ? mc.taxable : row.taxable;
              const displayPreTax = useMedian ? mc.preTax : row.preTax;
              const displayRoth = useMedian ? mc.roth : row.roth;
              const displayTotal = useMedian ? mc.total : row.total;

              return (
                <tr key={row.age} className={row.isAccumulation ? 'row-accum' : 'row-decum'}>
                  <td>{row.year}</td>
                  <td>{row.age}</td>
                  <td className="phase-name-cell">
                    {row.isAccumulation ? 'Accumulation' : (phase ? phase.name : '—')}
                  </td>

                  <CellTooltip
                    rows={cashRows}
                    endingLabel="Ending balance"
                    endingBalance={row.cash}
                  >
                    {formatCurrency(displayCash, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={taxableRows}
                    endingLabel="Ending balance"
                    endingBalance={row.taxable}
                  >
                    {formatCurrency(displayTaxable, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={preTaxRows}
                    endingLabel="Ending balance"
                    endingBalance={row.preTax}
                  >
                    {formatCurrency(displayPreTax, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={rothRows}
                    endingLabel="Ending balance"
                    endingBalance={row.roth}
                  >
                    {formatCurrency(displayRoth, true)}
                  </CellTooltip>

                  <CellTooltip
                    rows={totalRows.filter(r => r.condition !== false)}
                    endingLabel={netChange != null
                      ? `Net change: ${netChange >= 0 ? '+' : ''}${formatCurrency(netChange, true)}`
                      : 'Total'}
                    endingBalance={row.total}
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
