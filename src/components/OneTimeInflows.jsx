import React from 'react';
import { useAppState } from '../context/StateContext';
import { CollapsiblePanel } from './CollapsiblePanel';

export function OneTimeInflows() {
  const { state, updateField } = useAppState();
  const events = state.oneTimeInflows;

  function updateEvent(id, field, value) {
    const updated = events.map(e =>
      e.id === id
        ? { ...e, [field]: field === 'name' ? value : field === 'isTaxableIncome' ? value : Number(value) }
        : e
    );
    updateField('oneTimeInflows', updated);
  }

  function addEvent() {
    const last = events[events.length - 1];
    updateField('oneTimeInflows', [
      ...events,
      {
        id: Date.now(),
        name: 'Inflow',
        age: last ? Math.min(last.age + 5, state.endOfPlanAge) : state.person1Age + 10,
        preTax: 0,
        roth: 0,
        taxable: 100000,
        cash: 0,
        isTaxableIncome: false,
      },
    ]);
  }

  function removeEvent(id) {
    updateField('oneTimeInflows', events.filter(e => e.id !== id));
  }

  return (
    <CollapsiblePanel title="One-Time Inflows">
      <p className="section-note">
        Model windfalls, inheritances, or other lump-sum deposits at a specific age. Toggle "Taxable income?" if the event is ordinary income (e.g., selling a business). Applies in both accumulation and retirement.
      </p>

      <div className="spending-phases-list">
        {events.map(evt => (
          <div key={evt.id} className="spending-phase-row one-time-inflow-row">
            <div className="phase-header">
              <input
                className="phase-name-input"
                type="text"
                value={evt.name}
                onChange={e => updateEvent(evt.id, 'name', e.target.value)}
                placeholder="Event name"
                aria-label="Inflow event name"
              />
              <button
                className="btn-remove"
                onClick={() => removeEvent(evt.id)}
                title="Remove event"
              >
                Remove
              </button>
            </div>

            <div className="phase-fields contrib-phase-fields">
              <div className="phase-field">
                <label>Age</label>
                <input
                  type="number"
                  value={evt.age}
                  min={state.person1Age}
                  max={state.endOfPlanAge}
                  onChange={e => updateEvent(evt.id, 'age', Math.min(Math.max(Number(e.target.value), state.person1Age), state.endOfPlanAge))}
                  className="input-control"
                />
              </div>

              <div className="phase-field">
                <label>Taxable income?</label>
                <input
                  type="checkbox"
                  checked={!!evt.isTaxableIncome}
                  onChange={e => updateEvent(evt.id, 'isTaxableIncome', e.target.checked)}
                  aria-label="Is taxable income"
                />
              </div>

              <div className="contrib-amounts-grid">
                <div className="phase-field">
                  <label>Pre-Tax</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.preTax} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'preTax', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Roth</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.roth} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'roth', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Taxable</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.taxable} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'taxable', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
                <div className="phase-field">
                  <label>Cash</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input type="number" value={evt.cash} min={0} step={1000}
                      onChange={e => updateEvent(evt.id, 'cash', e.target.value)}
                      className="input-control has-prefix" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-add" onClick={addEvent}>
        + Add Inflow
      </button>
    </CollapsiblePanel>
  );
}
