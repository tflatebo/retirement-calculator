import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

export function HealthcareCosts() {
  const { state, updateField } = useAppState();
  const annualCost = state.healthcareCostMonthly * 12;
  const yearsOfCoverage = Math.max(0, state.healthcareEndAge - state.retirementAge);

  return (
    <CollapsiblePanel title="Healthcare (Pre-Medicare)" defaultOpen={false}>
      <p className="section-note">
        For ages before Medicare eligibility. Include ACA premiums, deductibles, and out-of-pocket costs.
        Enter $0/mo if covered by employer or already on Medicare.
        {yearsOfCoverage > 0 && annualCost > 0 && (
          <>{' '}That's <strong>${annualCost.toLocaleString()}/yr</strong> for {yearsOfCoverage} years = <strong>${(annualCost * yearsOfCoverage).toLocaleString()}</strong> total added to spending.</>
        )}
      </p>
      <div className="input-grid">
        <InputField
          label="Monthly Healthcare Cost"
          name="healthcareCostMonthly"
          value={state.healthcareCostMonthly}
          onChange={updateField}
          min={0} step={100}
          prefix="$"
          helpText="ACA premiums + deductibles + out-of-pocket for your household."
        />
        <InputField
          label="Healthcare Ends at Age"
          name="healthcareEndAge"
          value={state.healthcareEndAge}
          onChange={updateField}
          min={55} max={75}
          helpText="Typically 65 (Medicare eligibility). Set higher if delaying Medicare."
        />
      </div>
      {state.healthcareCostMonthly > 3000 && (
        <p className="field-warning">
          Over $3,000/mo is unusually high. Verify this includes only premiums and expected costs, not worst-case.
        </p>
      )}
    </CollapsiblePanel>
  );
}
