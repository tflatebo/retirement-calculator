import React from 'react';
import { useAppState } from '../context/StateContext';
import { CollapsiblePanel } from './CollapsiblePanel';
import { formatCurrency } from '../utils/format';
import { groupConsecutive, formatRanges } from '../utils/ranges';

export function ContributionPhases() {
  const { state, updateField } = useAppState();
  const phases = state.contributionPhases;

  function updatePhase(id, field, value) {
    const updated = phases.map(p =>
      p.id === id ? { ...p, [field]: field === 'name' ? value : Number(value) } : p
    );
    updateField('contributionPhases', updated);
  }

  function addPhase() {
    const lastPhase = phases[phases.length - 1];
    const newStart = lastPhase ? lastPhase.endAge + 1 : state.person1Age;
    const newEnd = Math.min(newStart + 10, state.retirementAge - 1);
    const newId = Date.now();
    updateField('contributionPhases', [
      ...phases,
      {
        id: newId,
        name: `Phase ${phases.length + 1}`,
        startAge: newStart,
        endAge: newEnd,
        preTax: lastPhase ? lastPhase.preTax : 0,
        roth: lastPhase ? lastPhase.roth : 0,
        taxable: lastPhase ? lastPhase.taxable : 0,
        cash: lastPhase ? lastPhase.cash : 0,
      },
    ]);
  }

  function removePhase(id) {
    updateField('contributionPhases', phases.filter(p => p.id !== id));
  }

  const minAge = state.person1Age;
  const maxAge = state.retirementAge - 1;

  // Gap detection over accumulation range
  const gapAges = [];
  for (let age = minAge; age <= maxAge; age++) {
    if (!phases.some(p => age >= p.startAge && age <= p.endAge)) {
      gapAges.push(age);
    }
  }

  const gapRanges = groupConsecutive(gapAges);

  // Overlap detection over accumulation range
  const overlapAges = [];
  for (let age = minAge; age <= maxAge; age++) {
    const covering = phases.filter(p => age >= p.startAge && age <= p.endAge);
    if (covering.length > 1) {
      overlapAges.push(age);
    }
  }
  const overlapRanges = groupConsecutive(overlapAges);

  const addDisabled = phases.length > 0 && phases[phases.length - 1].endAge >= maxAge;

  return (
    <CollapsiblePanel title="Contribution Phases (Accumulation Only)">
      <p className="section-note">
        Define how much you contribute in each period. Phases cover your accumulation years and stop automatically at retirement. A year with no phase means no contributions that year.
      </p>

      <div className="spending-phases-list">
        {phases.map((phase) => (
          <div key={phase.id} className="spending-phase-row">
            <div className="phase-header">
              <input
                className="phase-name-input"
                type="text"
                value={phase.name}
                onChange={e => updatePhase(phase.id, 'name', e.target.value)}
                placeholder="Phase name"
                aria-label="Contribution phase name"
              />
              <button
                className="btn-remove"
                onClick={() => removePhase(phase.id)}
                title="Remove phase"
                disabled={phases.length <= 1}
              >
                Remove
              </button>
            </div>
            <div className="phase-fields contrib-phase-fields">
              <div className="phase-field">
                <label>Start Age</label>
                <input
                  type="number"
                  value={phase.startAge}
                  min={minAge}
                  max={maxAge}
                  onChange={e => updatePhase(phase.id, 'startAge', Math.min(Math.max(Number(e.target.value), state.person1Age), state.retirementAge - 1))}
                  className="input-control"
                />
              </div>
              <div className="phase-field">
                <label>End Age</label>
                <input
                  type="number"
                  value={phase.endAge}
                  min={minAge}
                  max={maxAge}
                  onChange={e => updatePhase(phase.id, 'endAge', Math.min(Math.max(Number(e.target.value), state.person1Age), state.retirementAge - 1))}
                  className="input-control"
                />
              </div>
              <div className="contrib-amounts-grid">
                <div className="phase-field">
                  <label>Pre-Tax/yr</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      value={phase.preTax}
                      min={0}
                      step={1000}
                      onChange={e => updatePhase(phase.id, 'preTax', e.target.value)}
                      className="input-control has-prefix"
                    />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Roth/yr</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      value={phase.roth}
                      min={0}
                      step={1000}
                      onChange={e => updatePhase(phase.id, 'roth', e.target.value)}
                      className="input-control has-prefix"
                    />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Taxable/yr</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      value={phase.taxable}
                      min={0}
                      step={1000}
                      onChange={e => updatePhase(phase.id, 'taxable', e.target.value)}
                      className="input-control has-prefix"
                    />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Cash Savings/yr</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      value={phase.cash}
                      min={0}
                      step={1000}
                      onChange={e => updatePhase(phase.id, 'cash', e.target.value)}
                      className="input-control has-prefix"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-add"
        onClick={addPhase}
        disabled={addDisabled}
        title={addDisabled ? 'All accumulation ages are already covered' : undefined}
      >
        + Add Phase
      </button>

      {gapRanges.length > 0 && (
        <p className="phase-warning">
          Ages {formatRanges(gapRanges)} have no contribution phase — no contributions will be made. This may be intentional (e.g., a sabbatical or career gap).
        </p>
      )}

      {overlapRanges.length > 0 && (
        <p className="phase-warning">
          Ages {formatRanges(overlapRanges)} appear in more than one contribution phase. Only the first phase's amounts will apply.
        </p>
      )}
    </CollapsiblePanel>
  );
}
