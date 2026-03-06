import React from 'react';
import { useAppState } from '../context/StateContext';
import { InputField, TextInputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

export function GlobalInputs() {
  const { state, updateField } = useAppState();

  return (
    <CollapsiblePanel title="People & Timeline">
      <div className="input-grid">
        <TextInputField
          label="Person 1 Name"
          name="person1Name"
          value={state.person1Name}
          onChange={updateField}
        />
        <InputField
          label={`${state.person1Name} Current Age`}
          name="person1Age"
          value={state.person1Age}
          onChange={updateField}
          min={18} max={100}
        />
        {state.person1Age >= state.retirementAge && (
          <p className="field-warning">
            You are at or past your retirement age — accumulation phase will be skipped.
          </p>
        )}
        <TextInputField
          label="Person 2 Name"
          name="person2Name"
          value={state.person2Name}
          onChange={updateField}
        />
        <InputField
          label={`${state.person2Name} Current Age`}
          name="person2Age"
          value={state.person2Age}
          onChange={updateField}
          min={18} max={100}
        />
        <p className="field-note">
          Person 2's age is recorded for reference. All projections use Person 1's age as the plan timeline.
        </p>
        <InputField
          label={`If ${state.person2Name} Passes (${state.person1Name}'s age)`}
          name="spouseDeathAge"
          value={state.spouseDeathAge ?? ''}
          onChange={(field, value) => updateField(field, value === '' || value === null ? null : Number(value))}
          min={state.person1Age}
          max={state.endOfPlanAge}
          helpText="Leave blank to skip. Models the 'widow penalty': filing shifts to Single, SS drops, spending decreases."
        />
        {state.spouseDeathAge != null && (
          <InputField
            label="Spending Reduction After Death"
            name="spouseDeathSpendingReduction"
            value={state.spouseDeathSpendingReduction}
            onChange={updateField}
            min={0} max={50} step={5}
            suffix="%"
            helpText="Typical: 20-30%. Spending drops but doesn't halve."
          />
        )}
        <InputField
          label="Retirement Age"
          name="retirementAge"
          value={state.retirementAge}
          onChange={updateField}
          min={40} max={80}
          helpText="Age accumulation phase ends"
        />
        <InputField
          label="End of Plan Age"
          name="endOfPlanAge"
          value={state.endOfPlanAge}
          onChange={updateField}
          min={state.retirementAge + 1} max={120}
          helpText="Planning horizon"
        />
        {state.endOfPlanAge <= state.retirementAge && (
          <p className="field-warning">
            End of plan age must be greater than retirement age.
          </p>
        )}
        <InputField
          label="Stock Return Rate (after inflation) %"
          name="realReturn"
          value={state.realReturn}
          onChange={updateField}
          min={0} max={20} step={0.1}
          suffix="%"
          helpText="Annual real return for equities after subtracting inflation. If you expect 8% nominal stock returns and 3% inflation, enter 5%."
        />
        <InputField
          label="Bond Return Rate (after inflation) %"
          name="bondsReturnRate"
          value={state.bondsReturnRate}
          onChange={updateField}
          min={-2} max={10} step={0.1}
          suffix="%"
          helpText="Annual real return for bonds after subtracting inflation. Bonds typically return 1–3% real. Default 2%."
        />
        <InputField
          label="Stocks Allocation %"
          name="stocksAllocationPct"
          value={state.stocksAllocationPct}
          onChange={updateField}
          min={0} max={100} step={5}
          suffix="%"
          helpText="Percentage of invested portfolio in stocks. The rest is in bonds. 60% stocks / 40% bonds is a common balanced portfolio."
        />
        <InputField
          label="Assumed Inflation Rate %"
          name="inflationRate"
          value={state.inflationRate}
          onChange={updateField}
          min={0} max={10} step={0.5}
          suffix="%"
          helpText="Tax brackets and standard deduction inflate annually by this rate. SS thresholds are fixed by law."
        />
        <InputField
          label="Monte Carlo Simulations"
          name="numSimulations"
          value={state.numSimulations}
          onChange={updateField}
          min={100} max={10000} step={100}
          helpText="1000 recommended"
        />
        {state.numSimulations > 2000 && (
          <p className="field-warning">
            High values may slow the browser. 1,000 is recommended.
          </p>
        )}
        <InputField
          label="Portfolio Volatility (σ)"
          name="mcSigma"
          value={state.mcSigma}
          onChange={updateField}
          min={2} max={30} step={1}
          suffix="%"
          helpText="Annualized standard deviation. 8% = conservative bonds, 12% = balanced 60/40, 17% = aggressive equity."
        />
      </div>
    </CollapsiblePanel>
  );
}
