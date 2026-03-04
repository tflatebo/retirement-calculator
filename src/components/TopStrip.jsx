import React from 'react';
import { formatCurrency } from '../utils/format';

export function TopStrip({ summary, state }) {
  // UX-2: render placeholder strip instead of returning null while summary loads
  const placeholder = '—';
  const { totalToday, projectedAtRetirement, projectedAtEnd, requiredAtRetirement, onTrack } = summary || {};
  const gap = summary ? projectedAtRetirement - requiredAtRetirement : null;

  // UX-3: when already retired, the "projected at retirement" card shows current value
  const alreadyRetired = state.person1Age >= state.retirementAge;
  const projectedLabel = alreadyRetired ? 'Portfolio at Plan Start' : 'Projected at Retirement (median)';
  const projectedSub = alreadyRetired ? 'Current portfolio value' : `Age ${state.retirementAge - 1} (end of accumulation)`;

  return (
    <div className="top-strip">
      <div className="strip-card">
        <div className="strip-label">Total Portfolio Today</div>
        <div className="strip-value">{summary ? formatCurrency(totalToday) : placeholder}</div>
      </div>
      <div className="strip-card">
        <div className="strip-label">{projectedLabel}</div>
        <div className="strip-value">{summary ? formatCurrency(projectedAtRetirement) : placeholder}</div>
        <div className="strip-sub">{projectedSub}</div>
      </div>
      <div className={`strip-card ${summary ? (onTrack ? 'strip-good' : 'strip-warn') : ''}`}>
        <div className="strip-label">On-Track?</div>
        <div className="strip-value strip-status">
          {summary ? (onTrack ? 'On Track' : 'Shortfall') : placeholder}
        </div>
        {gap !== null && (
          <>
            <div className="strip-sub">
              {gap >= 0
                ? `+${formatCurrency(gap, true)} above target`
                : `${formatCurrency(Math.abs(gap), true)} below target`}
            </div>
            <div className="strip-sub">Median projection vs estimated need</div>
          </>
        )}
      </div>
      <div className="strip-card">
        <div className="strip-label">Projected at End of Plan (median)</div>
        <div className="strip-value">{summary ? formatCurrency(projectedAtEnd) : placeholder}</div>
        <div className="strip-sub">Age {state.endOfPlanAge}</div>
      </div>
    </div>
  );
}
