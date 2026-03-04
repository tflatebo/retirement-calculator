import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { InputField } from './InputField';
import { CollapsiblePanel } from './CollapsiblePanel';

const DEFAULT_DEDUCTION_MFJ = 30000;
const DEFAULT_DEDUCTION_SINGLE = 15000;

export function TaxInputs() {
  const { state, updateField } = useAppState();
  const [standardDeductionOverridden, setStandardDeductionOverridden] = useState(false);

  const filingDefault = state.filingStatus === 'single'
    ? DEFAULT_DEDUCTION_SINGLE
    : DEFAULT_DEDUCTION_MFJ;

  function handleFilingStatusChange(newStatus) {
    updateField('filingStatus', newStatus);
    // Auto-populate standard deduction only if user has not overridden it
    if (!standardDeductionOverridden) {
      const newDefault = newStatus === 'single' ? DEFAULT_DEDUCTION_SINGLE : DEFAULT_DEDUCTION_MFJ;
      updateField('standardDeduction', newDefault);
    }
  }

  function handleStandardDeductionChange(field, value) {
    setStandardDeductionOverridden(true);
    updateField(field, value);
  }

  function resetStandardDeduction() {
    setStandardDeductionOverridden(false);
    updateField('standardDeduction', filingDefault);
  }

  const deductionDiffersFromDefault = state.standardDeduction !== filingDefault;

  return (
    <CollapsiblePanel title="Tax & Roth Conversion">
      <div className="input-grid">

        {/* ── Section 1: Tax Setup ────────────────────────────────────────── */}
        <p className="section-subheading">Tax Setup</p>

        {/* Filing Status radio group */}
        <div className="input-field" style={{ gridColumn: '1 / -1' }}>
          <label className="input-label">Filing Status</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="filingStatus"
                value="mfj"
                checked={state.filingStatus === 'mfj'}
                onChange={() => handleFilingStatusChange('mfj')}
              />
              Married Filing Jointly
            </label>
            <label>
              <input
                type="radio"
                name="filingStatus"
                value="single"
                checked={state.filingStatus === 'single'}
                onChange={() => handleFilingStatusChange('single')}
              />
              Single
            </label>
          </div>
        </div>

        {/* Standard Deduction */}
        <div className="input-field" style={{ gridColumn: '1 / -1' }}>
          <InputField
            label="Standard Deduction"
            name="standardDeduction"
            value={state.standardDeduction}
            onChange={handleStandardDeductionChange}
            min={0}
            step={500}
            prefix="$"
            helpText="Reduces taxable income before applying brackets. Defaults match 2025 IRS amounts."
          />
          {deductionDiffersFromDefault && (
            <button
              className="link-reset-deduction"
              type="button"
              onClick={resetStandardDeduction}
            >
              Reset to ${filingDefault.toLocaleString()} default
            </button>
          )}
        </div>

        {/* State Tax Rate */}
        <InputField
          label="State Income Tax Rate"
          name="stateTaxRate"
          value={state.stateTaxRate}
          onChange={updateField}
          min={0}
          max={15}
          step={0.25}
          suffix="%"
          helpText="Applied to ordinary income (pre-tax withdrawals, conversions). Set 0 for no state tax."
        />

        {/* SS State Exemption — only shown when state tax > 0 */}
        {state.stateTaxRate > 0 && (
          <div className="toggle-row">
            <input
              type="checkbox"
              id="ssStateExempt"
              checked={!!state.ssStateExempt}
              onChange={e => updateField('ssStateExempt', e.target.checked)}
            />
            <label htmlFor="ssStateExempt" className="toggle-row-label">
              Social Security exempt from state tax
              <span className="toggle-row-help">
                Many states do not tax SS income. Check your state's rules.
              </span>
            </label>
          </div>
        )}

        <hr className="section-divider" />

        {/* ── Section 2: Roth Conversion ─────────────────────────────────── */}
        <p className="section-subheading">Roth Conversion</p>

        {/* Strategy segmented control */}
        <div className="input-field" style={{ gridColumn: '1 / -1' }}>
          <label className="input-label">Conversion Strategy</label>
          <div className="segmented-control" role="group" aria-label="Conversion Strategy">
            <button
              type="button"
              aria-pressed={state.rothConversionStrategy === 'fixed'}
              className={state.rothConversionStrategy === 'fixed' ? 'active' : ''}
              onClick={() => updateField('rothConversionStrategy', 'fixed')}
            >
              Fixed Amount
            </button>
            <button
              type="button"
              aria-pressed={state.rothConversionStrategy === 'bracket'}
              className={state.rothConversionStrategy === 'bracket' ? 'active' : ''}
              onClick={() => updateField('rothConversionStrategy', 'bracket')}
            >
              Fill to Bracket Ceiling
            </button>
          </div>
        </div>

        {/* Shared fields for both strategies */}
        <InputField
          label="Conversion Window Start Age"
          name="rothConversionStartAge"
          value={state.rothConversionStartAge}
          onChange={updateField}
          min={40}
          max={90}
        />
        <InputField
          label="Conversion Window End Age"
          name="rothConversionEndAge"
          value={state.rothConversionEndAge}
          onChange={updateField}
          min={40}
          max={90}
        />

        {state.rothConversionStartAge < state.retirementAge && (
          <p className="roth-warning">
            The conversion window starts before retirement (age {state.retirementAge}). Conversions will only run from age {state.retirementAge} onward. Set the start age to {state.retirementAge} or later to match your plan.
          </p>
        )}

        {/* Fixed Amount strategy fields */}
        {state.rothConversionStrategy === 'fixed' && (
          <InputField
            label="Conversion Amount / yr"
            name="rothConversionAmount"
            value={state.rothConversionAmount}
            onChange={updateField}
            min={0}
            step={1000}
            prefix="$"
            helpText="Shifted from pre-tax to Roth annually during conversion window."
          />
        )}

        {/* Bracket Ceiling strategy fields */}
        {state.rothConversionStrategy === 'bracket' && (
          <div className="conditional-block">
            <div className="input-field">
              <label className="input-label">Target Bracket Ceiling</label>
              <div className="segmented-control" role="group" aria-label="Target Bracket Ceiling">
                {[12, 22, 24].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    aria-pressed={state.rothConversionTargetBracket === rate}
                    className={state.rothConversionTargetBracket === rate ? 'active' : ''}
                    onClick={() => updateField('rothConversionTargetBracket', rate)}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
            <InputField
              label="Annual Conversion Cap"
              name="rothConversionAnnualCap"
              value={state.rothConversionAnnualCap}
              onChange={updateField}
              min={0}
              step={10000}
              prefix="$"
              helpText="Maximum converted per year even if bracket room exists."
            />
            <div className="info-callout">
              <strong>How bracket filling works</strong>
              Each year, the engine converts as much pre-tax funds as fits within the {state.rothConversionTargetBracket}% bracket ceiling — after accounting for Social Security and other income. This maximizes Roth conversion at the lowest marginal rate and reduces future RMDs.
            </div>
          </div>
        )}

      </div>
    </CollapsiblePanel>
  );
}
