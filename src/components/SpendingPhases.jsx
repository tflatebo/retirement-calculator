import React from 'react';
import { useAppState } from '../context/StateContext';
import { CollapsiblePanel } from './CollapsiblePanel';
import { formatCurrency } from '../utils/format';
import { groupConsecutive, formatRanges } from '../utils/ranges';

export function SpendingPhases() {
  const { state, updateField } = useAppState();
  const phases = state.spendingPhases;

  function updatePhase(id, field, value) {
    const updated = phases.map(p =>
      p.id === id ? { ...p, [field]: field === 'name' ? value : Number(value) } : p
    );
    updateField('spendingPhases', updated);
  }

  function addPhase() {
    const lastPhase = phases[phases.length - 1];
    // Fix 4c: use lastPhase.endAge + 1 to avoid an immediate overlap with the previous phase
    const newStart = lastPhase ? lastPhase.endAge + 1 : state.retirementAge;
    const newEnd = Math.min(newStart + 10, state.endOfPlanAge);
    const newId = Date.now();
    updateField('spendingPhases', [
      ...phases,
      { id: newId, name: `Phase ${phases.length + 1}`, startAge: newStart, endAge: newEnd, annualSpend: 100000 },
    ]);
  }

  function removePhase(id) {
    updateField('spendingPhases', phases.filter(p => p.id !== id));
  }

  // Fix 4a: compute gap ages across the decumulation period
  const retAge = state.retirementAge;
  const endAge = state.endOfPlanAge;
  const gapAges = [];
  for (let age = retAge; age <= endAge; age++) {
    if (!phases.some(p => age >= p.startAge && age <= p.endAge)) {
      gapAges.push(age);
    }
  }

  const gapRanges = groupConsecutive(gapAges);

  // Fix 4b: compute overlap ages
  const overlapAges = [];
  for (let age = retAge; age <= endAge; age++) {
    const covering = phases.filter(p => age >= p.startAge && age <= p.endAge);
    if (covering.length > 1) {
      overlapAges.push(age);
    }
  }
  const overlapRanges = groupConsecutive(overlapAges);

  return (
    <CollapsiblePanel title="Spending Phases">
      <p className="section-note">
        Define spending periods across your retirement. Add, remove, and rename freely.
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
                aria-label="Spending phase name"
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
            <div className="phase-fields">
              <div className="phase-field">
                <label>Start Age</label>
                <input
                  type="number"
                  value={phase.startAge}
                  min={state.retirementAge}
                  max={state.endOfPlanAge}
                  onChange={e => updatePhase(phase.id, 'startAge', Math.min(Math.max(Number(e.target.value), state.retirementAge), state.endOfPlanAge))}
                  className="input-control"
                />
              </div>
              <div className="phase-field">
                <label>End Age</label>
                <input
                  type="number"
                  value={phase.endAge}
                  min={state.retirementAge}
                  max={state.endOfPlanAge}
                  onChange={e => updatePhase(phase.id, 'endAge', Math.min(Math.max(Number(e.target.value), state.retirementAge), state.endOfPlanAge))}
                  className="input-control"
                />
              </div>
              <div className="phase-field">
                <label>Monthly Spending (after-tax)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    value={phase.annualSpend / 12}
                    min={0}
                    step={100}
                    onChange={e => updatePhase(phase.id, 'annualSpend', Math.round(Number(e.target.value) * 12))}
                    className="input-control has-prefix"
                  />
                </div>
                <span className="phase-field-note">= {formatCurrency(phase.annualSpend)} / year</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-add"
        onClick={addPhase}
        disabled={phases.length > 0 && phases[phases.length - 1].endAge >= state.endOfPlanAge}
        title={phases.length > 0 && phases[phases.length - 1].endAge >= state.endOfPlanAge
          ? 'All ages up to end of plan are already covered'
          : undefined}
      >
        + Add Spending Phase
      </button>

      {/* Fix 4a: gap warnings */}
      {gapRanges.length > 0 && (
        <p className="phase-warning">
          Ages {formatRanges(gapRanges)} are not covered by any spending phase and will be modeled as $0 spending. Extend an existing phase or add a new one to cover this period.
        </p>
      )}

      {/* Fix 4b: overlap warnings */}
      {overlapRanges.length > 0 && (
        <p className="phase-warning">
          Ages {formatRanges(overlapRanges)} appear in more than one phase. Only the first listed phase's spending will apply. Adjust the start or end ages to remove the overlap.
        </p>
      )}
    </CollapsiblePanel>
  );
}
