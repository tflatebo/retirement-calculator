import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

export function CashRules() {
  const { state, updateField } = useAppState();

  return (
    <CollapsiblePanel title="Cash Replenishment Rules">
      <p className="section-note">
        The cash bucket strategy keeps liquid reserves to avoid selling investments in down markets. Adjusting these settings changes how aggressively the model refills your cash buffer.
      </p>
      <div className="input-grid">
        <InputField
          label="Cash Buffer (Months of Spending)"
          name="targetCashBufferMonths"
          value={state.targetCashBufferMonths}
          onChange={updateField}
          min={0} max={120} step={1}
          suffix=" months"
          helpText="Cash earns the Cash Return Rate below — a larger buffer still reduces long-term growth because cash typically earns less than invested accounts. Any cash remaining at end of plan is included in the projected total."
        />
        <InputField
          label="Market Decline Threshold"
          name="marketDeclineThreshold"
          value={state.marketDeclineThreshold}
          onChange={updateField}
          min={0} max={80} step={1}
          suffix="%"
          helpText="If portfolio dropped more than this %, pause cash replenishment"
        />
        <InputField
          label="Cash Return Rate"
          name="cashReturnRate"
          value={state.cashReturnRate}
          onChange={updateField}
          min={0} max={10} step={0.5}
          suffix="%"
          helpText="Annual return on cash reserves (money market, T-bills). Set 0 for conservative estimate."
        />
      </div>
    </CollapsiblePanel>
  );
}
