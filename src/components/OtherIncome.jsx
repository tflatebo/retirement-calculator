import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

export function OtherIncome() {
  const { state, updateField } = useAppState();

  return (
    <CollapsiblePanel title="Pension / Other Income" defaultOpen={false}>
      <p className="section-note">
        Pension income is taxed as ordinary income and offsets required portfolio withdrawals.
        Set to $0 if no pension.
      </p>
      <div className="input-grid">
        <InputField
          label="Annual Pension Income"
          name="pensionIncome"
          value={state.pensionIncome}
          onChange={updateField}
          min={0} step={1000}
          prefix="$"
          helpText="Taxed as ordinary income. Set $0 if no pension."
        />
        {state.pensionIncome > 0 && (
          <>
            <InputField
              label="Pension Start Age"
              name="pensionStartAge"
              value={state.pensionStartAge}
              onChange={updateField}
              min={40} max={80}
            />
            <InputField
              label="Pension COLA"
              name="pensionCola"
              value={state.pensionCola}
              onChange={updateField}
              min={0} max={5} step={0.5}
              suffix="%"
              helpText="Annual cost-of-living adjustment. 0% = fixed. 2-3% = typical COLA."
            />
          </>
        )}
      </div>
    </CollapsiblePanel>
  );
}
