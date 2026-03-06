import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import './App.css';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DEFAULT_STATE } from './defaultState';
import { StateContext } from './context/StateContext';
import { runDeterministic, computeSummary } from './engine/calculator';

import { GlobalInputs } from './components/GlobalInputs';
import { AccountBalances } from './components/AccountBalances';
import { ContributionPhases } from './components/ContributionPhases';
import { TaxInputs } from './components/TaxInputs';
import { WithdrawalStrategy } from './components/WithdrawalStrategy';
import { SocialSecurity } from './components/SocialSecurity';
import { CashRules } from './components/CashRules';
import { SpendingPhases } from './components/SpendingPhases';
import { HealthcareCosts } from './components/HealthcareCosts';
import { OtherIncome } from './components/OtherIncome';
import { TopStrip } from './components/TopStrip';
import { MainChart } from './components/MainChart';
import { YearTable } from './components/YearTable';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [state, setState] = useLocalStorage('retirementCalcState', DEFAULT_STATE);

  // PERF-1: Monte Carlo runs in a Web Worker to avoid blocking the main thread
  const [mcData, setMcData] = useState([]);
  const [mcPending, setMcPending] = useState(false);
  const workerRef = useRef(null);
  const debounceRef = useRef(null);

  // UX-1: two-step reset confirmation to avoid accidental data loss
  const [resetPending, setResetPending] = useState(false);
  const resetTimerRef = useRef(null);

  const updateField = useCallback((field, value) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, [setState]);

  const updateFields = useCallback((patch) => {
    setState(prev => ({ ...prev, ...patch }));
  }, [setState]);

  // Merge any new keys from DEFAULT_STATE into persisted state (handles schema migrations)
  const mergedState = useMemo(() => {
    const merged = { ...DEFAULT_STATE, ...state };
    // Migration: old states had a single ssStartAge field. When an old state is loaded,
    // { ...DEFAULT_STATE, ...state } gives person1SsStartAge=67 (from DEFAULT_STATE)
    // even when the old state had ssStartAge set to a different value. Fix this by
    // applying the legacy ssStartAge if the new per-person fields are absent from state.
    if (state.ssStartAge != null && state.person1SsStartAge == null) {
      merged.person1SsStartAge = state.ssStartAge;
    }
    if (state.ssStartAge != null && state.person2SsStartAge == null) {
      merged.person2SsStartAge = state.ssStartAge;
    }
    return merged;
  }, [state]);

  // Check for invalid configuration before running engine
  const configInvalid = useMemo(() => {
    return (
      mergedState.endOfPlanAge <= mergedState.retirementAge ||
      mergedState.person1Age >= mergedState.endOfPlanAge ||
      mergedState.person1Age > mergedState.retirementAge
    );
  }, [mergedState]);

  // Run deterministic calculation (fast — stays on main thread)
  const deterministicYears = useMemo(() => {
    if (configInvalid) return [];
    try {
      return runDeterministic(mergedState);
    } catch (e) {
      console.error('Deterministic calculation error:', e);
      return [];
    }
  }, [mergedState, configInvalid]);

  // PERF-1: Spin up the Monte Carlo Web Worker once on mount
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./workers/monteCarlo.worker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage = (e) => {
      setMcData(e.data);
      setMcPending(false);
    };
    workerRef.current.onerror = (err) => {
      console.error('Monte Carlo worker error:', err);
      setMcPending(false);
    };
    return () => {
      workerRef.current?.terminate();
      clearTimeout(debounceRef.current);
    };
  }, []);

  // PERF-1: Send state to worker on change, debounced 300ms
  useEffect(() => {
    if (configInvalid) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMcPending(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      workerRef.current?.postMessage({ state: mergedState });
    }, 300);
  }, [mergedState, configInvalid]);

  // When config is invalid, treat MC data/pending as empty/false without setState
  const effectiveMcData = useMemo(() => configInvalid ? [] : mcData, [configInvalid, mcData]);
  const effectiveMcPending = configInvalid ? false : mcPending;

  // Compute summary stats
  const summary = useMemo(() => {
    if (!deterministicYears.length || !effectiveMcData.length) return null;
    try {
      return computeSummary(mergedState, deterministicYears, effectiveMcData);
    } catch (e) {
      console.error('Summary error:', e);
      return null;
    }
  }, [mergedState, deterministicYears, effectiveMcData]);

  const contextValue = useMemo(() => ({
    state: mergedState,
    updateField,
    updateFields,
  }), [mergedState, updateField, updateFields]);

  // ARCH-1: memoized reset handler; UX-1: two-step confirmation
  const resetToDefaults = useCallback(() => {
    if (resetPending) {
      clearTimeout(resetTimerRef.current);
      setResetPending(false);
      setState(DEFAULT_STATE);
    } else {
      setResetPending(true);
      resetTimerRef.current = setTimeout(() => setResetPending(false), 3000);
    }
  }, [resetPending, setState]);

  return (
    <StateContext.Provider value={contextValue}>
      <div className="app-container">
        {/* App Header */}
        <header className="app-header">
          <div className="app-header-inner">
            <h1 className="app-title">Retirement Calculator</h1>
            <p className="app-subtitle">
              {mergedState.person1Name} & {mergedState.person2Name}
              {' — '}
              Plan to age {mergedState.endOfPlanAge}
            </p>
          </div>
          {/* UX-1: two-step reset */}
          <button
            className={`btn-reset ${resetPending ? 'btn-reset-confirm' : ''}`}
            onClick={resetToDefaults}
          >
            {resetPending ? 'Confirm Reset?' : 'Reset Defaults'}
          </button>
        </header>

        {/* A11Y-3: role="alert" so screen readers announce this when it appears */}
        {configInvalid && (
          <div className="config-error-banner" role="alert">
            Your ages are inconsistent: end of plan age must be greater than retirement age, your current age must be less than end of plan age, and your current age must not exceed your retirement age. Open the People &amp; Timeline section to fix this.
          </div>
        )}

        {/* Top Strip Summary */}
        <TopStrip summary={summary} state={mergedState} />

        {/* Main Content: Inputs + Chart */}
        <div className="main-layout">
          {/* Left column: Inputs */}
          <aside className="inputs-panel">
            <GlobalInputs />
            <AccountBalances />
            <ContributionPhases />
            <TaxInputs />
            <WithdrawalStrategy />
            <SocialSecurity />
            <OtherIncome />
            <SpendingPhases />
            <HealthcareCosts />
            <CashRules />
          </aside>

          {/* Right column: Chart + Table */}
          <main className="output-panel">
            {/* PERF-1: show pending indicator while worker computes */}
            <ErrorBoundary>
              <div style={{ position: 'relative' }}>
                {effectiveMcPending && (
                  <div className="mc-pending-overlay">Calculating…</div>
                )}
                <MainChart
                  mcData={effectiveMcData}
                  deterministicYears={deterministicYears}
                />
              </div>
            </ErrorBoundary>
            <ErrorBoundary>
              <YearTable years={deterministicYears} mcData={effectiveMcData} state={mergedState} />
            </ErrorBoundary>
          </main>
        </div>

        <footer className="app-footer">
          <p>All data stored locally in your browser. No data is sent to any server.</p>
        </footer>
      </div>
    </StateContext.Provider>
  );
}

export default App;
