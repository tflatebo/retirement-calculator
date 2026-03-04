import React from 'react';
import { useAppState } from '../context/StateContext';
import { CollapsiblePanel } from './CollapsiblePanel';

const STRATEGIES = [
  {
    value: 'conventional',
    title: 'Conventional',
    desc: 'Draws taxable brokerage first, then pre-tax (401k/IRA), then Roth last. Best for most retirees.',
    note: 'Watch out for: large pre-tax balances can create large RMDs after age 73.',
  },
  {
    value: 'proportional',
    title: 'Proportional',
    desc: 'Withdraws from all three account types proportionally each year. Best for: investors who want to maintain account-type balance.',
    note: 'Watch out for: reduces the benefit of tax deferral.',
  },
  {
    value: 'bracket',
    title: 'Tax Bracket Filling',
    desc: 'Draws from pre-tax only up to the ceiling of your chosen bracket each year. Taxable brokerage covers the next shortfall; Roth is last. Best for: retirees with large pre-tax balances preparing for RMDs.',
    note: null,
  },
];

export function WithdrawalStrategy() {
  const { state, updateField } = useAppState();

  return (
    <CollapsiblePanel title="Withdrawal Strategy" defaultOpen={false}>
      <p className="section-note">
        Withdrawal strategy controls which account type is drawn from first during decumulation. The right strategy can reduce lifetime taxes significantly.
      </p>

      <div className="strategy-radio-group">
        {STRATEGIES.map(s => (
          <label
            key={s.value}
            className={`strategy-option${state.withdrawalStrategy === s.value ? ' selected' : ''}`}
          >
            <input
              type="radio"
              name="withdrawalStrategy"
              value={s.value}
              checked={state.withdrawalStrategy === s.value}
              onChange={() => updateField('withdrawalStrategy', s.value)}
            />
            <div className="strategy-option-body">
              <span className="strategy-option-title">{s.title}</span>
              <span className="strategy-option-desc">{s.desc}</span>
              {s.note && (
                <span className="strategy-option-note">{s.note}</span>
              )}
            </div>
          </label>
        ))}
      </div>

      {state.withdrawalStrategy === 'bracket' && (
        <div className="conditional-block" style={{ marginTop: '10px' }}>
          <div className="input-field">
            <label className="input-label">Target Bracket Ceiling</label>
            <div className="segmented-control" role="group" aria-label="Target Bracket Ceiling">
              {[12, 22, 24].map(rate => (
                <button
                  key={rate}
                  type="button"
                  aria-pressed={state.withdrawalTargetBracket === rate}
                  className={state.withdrawalTargetBracket === rate ? 'active' : ''}
                  onClick={() => updateField('withdrawalTargetBracket', rate)}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
          <p className="field-note" style={{ margin: 0 }}>
            Pre-tax withdrawals are capped so that taxable income stays within the {state.withdrawalTargetBracket}% bracket. Roth covers any remaining spending need.
          </p>
        </div>
      )}
    </CollapsiblePanel>
  );
}
