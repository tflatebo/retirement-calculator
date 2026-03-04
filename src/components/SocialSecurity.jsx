import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

export function SocialSecurity() {
  const { state, updateField } = useAppState();
  const combinedMonthly = state.person1SSMonthly + state.person2SSMonthly;

  return (
    <CollapsiblePanel title="Social Security">
      <p className="section-note">
        Each person claims independently. After spouse death, survivor keeps the higher benefit.
        Combined: ${combinedMonthly.toLocaleString()}/mo = ${(combinedMonthly * 12).toLocaleString()}/yr
      </p>
      <div className="input-grid">
        <InputField
          label={`${state.person1Name} SS Start Age`}
          name="person1SsStartAge"
          value={state.person1SsStartAge}
          onChange={updateField}
          min={62} max={70}
        />
        <InputField
          label={`${state.person2Name} SS Start Age`}
          name="person2SsStartAge"
          value={state.person2SsStartAge}
          onChange={updateField}
          min={62} max={70}
        />
        <InputField
          label={`${state.person1Name} Monthly Benefit`}
          name="person1SSMonthly"
          value={state.person1SSMonthly}
          onChange={updateField}
          min={0} step={50}
          prefix="$"
        />
        <InputField
          label={`${state.person2Name} Monthly Benefit`}
          name="person2SSMonthly"
          value={state.person2SSMonthly}
          onChange={updateField}
          min={0} step={50}
          prefix="$"
        />
      </div>
    </CollapsiblePanel>
  );
}
