import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';
import { formatCurrency } from '../utils/format';

export function AccountBalances() {
  const { state, updateField } = useAppState();
  const total = state.cashBalance + state.taxableBalance + state.preTaxBalance + state.rothBalance;
  const costBasisExceedsBalance = (state.taxableCostBasis || 0) > (state.taxableBalance || 0);

  return (
    <CollapsiblePanel title="Account Balances Today" badge={formatCurrency(total)}>
      <div className="input-grid">
        <InputField
          label="Cash"
          name="cashBalance"
          value={state.cashBalance}
          onChange={updateField}
          min={0} step={1000}
          prefix="$"
          helpText="Primary spend account"
        />
        <InputField
          label="Taxable Brokerage"
          name="taxableBalance"
          value={state.taxableBalance}
          onChange={updateField}
          min={0} step={1000}
          prefix="$"
          helpText="First drawn in decumulation"
        />

        {/* Cost Basis sub-field — indented under Taxable Brokerage */}
        <div className="sub-field">
          <InputField
            label="Cost Basis"
            name="taxableCostBasis"
            value={state.taxableCostBasis}
            onChange={updateField}
            min={0} step={1000}
            prefix="$"
            helpText="What you originally paid for these investments. Only gains above this are taxed at capital gains rates."
          />
        </div>

        {costBasisExceedsBalance && (
          <p className="field-warning">
            Cost basis exceeds your taxable account balance. Check your entries.
          </p>
        )}

        <InputField
          label="Pre-Tax 401k / IRA"
          name="preTaxBalance"
          value={state.preTaxBalance}
          onChange={updateField}
          min={0} step={1000}
          prefix="$"
          helpText="Taxed on withdrawal"
        />
        <InputField
          label="Roth"
          name="rothBalance"
          value={state.rothBalance}
          onChange={updateField}
          min={0} step={1000}
          prefix="$"
          helpText="Last resort, tax-free"
        />
      </div>
      <div className="total-row">
        <span className="total-label">Total Portfolio Today</span>
        <span className="total-value">{formatCurrency(total)}</span>
      </div>
    </CollapsiblePanel>
  );
}
