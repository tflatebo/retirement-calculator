import React from 'react';
import { useAppState } from '../context/StateContext';
import { CollapsiblePanel } from './CollapsiblePanel';

export function OneTimeOutflows() {
  const { state, updateField } = useAppState();
  const events = state.oneTimeOutflows;

  function updateEvent(id, field, value) {
    const updated = events.map(e =>
      e.id === id
        ? { ...e, [field]: field === 'name' ? value : Number(value) }
        : e
    );
    updateField('oneTimeOutflows', updated);
  }

  function addEvent() {
    const last = events[events.length - 1];
    updateField('oneTimeOutflows', [
      ...events,
      {
        id: Date.now(),
        name: 'Outflow',
        age: last ? Math.min(last.age + 5, state.endOfPlanAge) : state.person1Age + 10,
        amount: 50000,
      },
    ]);
  }

  function removeEvent(id) {
    updateField('oneTimeOutflows', events.filter(e => e.id !== id));
  }

  return (
    <CollapsiblePanel title="One-Time Outflows">
      <p className="section-note">
        Model gifts, large purchases, or other lump-sum withdrawals at a specific age. Money is drawn using your configured withdrawal strategy. Applies in both accumulation and retirement.
      </p>

      <div className="spending-phases-list">
        {events.map(evt => (
          <div key={evt.id} className="spending-phase-row one-time-outflow-row">
            <div className="phase-header">
              <input
                className="phase-name-input"
                type="text"
                value={evt.name}
                onChange={e => updateEvent(evt.id, 'name', e.target.value)}
                placeholder="Event name"
                aria-label="Outflow event name"
              />
              <button
                className="btn-remove"
                onClick={() => removeEvent(evt.id)}
                title="Remove event"
              >
                Remove
              </button>
            </div>

            <div className="phase-fields">
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
                <label>Amount</label>
                <div className="input-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    value={evt.amount}
                    min={0}
                    step={1000}
                    onChange={e => updateEvent(evt.id, 'amount', e.target.value)}
                    className="input-control has-prefix"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-add" onClick={addEvent}>
        + Add Outflow
      </button>
    </CollapsiblePanel>
  );
}
