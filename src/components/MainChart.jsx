import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../utils/format';
import { useAppState } from '../context/StateContext';
import { DragHandleLayer } from './DragHandleLayer';

function formatYAxis(value) {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(0) + 'K';
  return '$' + value;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-age">Age {label}</p>
      {payload.map(entry => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function MainChart({ mcData, deterministicYears }) {
  const { state, updateFields } = useAppState();
  if (!mcData || mcData.length === 0) return null;

  // Merge MC data with deterministic for the chart
  const chartData = mcData.map(d => {
    const det = deterministicYears.find(y => y.age === d.age);
    return {
      age: d.age,
      p10: Math.max(0, d.p10),
      p50: Math.max(0, d.p50),
      p90: Math.max(0, d.p90),
      deterministic: det ? Math.max(0, det.total) : 0,
    };
  });

  // Spending phase band colors
  const phaseColors = ['#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff8e1', '#fce4ec'];

  return (
    <div className="chart-container" data-testid="main-chart-container">
      <h3 className="chart-title">Portfolio Projection</h3>
      <p className="chart-subtitle">
        Monte Carlo simulation — 10th / 50th / 90th percentile. Shaded bands show spending phases.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

          {/* Spending phase bands */}
          {state.spendingPhases.map((phase, idx) => (
            <ReferenceArea
              key={phase.id}
              x1={phase.startAge}
              x2={phase.endAge}
              fill={phaseColors[idx % phaseColors.length]}
              fillOpacity={0.5}
              label={{ value: phase.name, position: 'insideTopLeft', fontSize: 10, fill: '#555' }}
            />
          ))}

          {/* P90 - P10 band (fill between) */}
          <Area
            type="monotone"
            dataKey="p90"
            fill="#bbdefb"
            stroke="#90caf9"
            strokeWidth={1}
            name="90th percentile"
            fillOpacity={0.4}
          />
          <Area
            type="monotone"
            dataKey="p10"
            fill="#ffffff"
            stroke="#ef9a9a"
            strokeWidth={1}
            name="10th percentile"
            fillOpacity={1}
          />

          {/* Median line */}
          <Line
            type="monotone"
            dataKey="p50"
            stroke="#1565c0"
            strokeWidth={2.5}
            dot={false}
            name="Median (50th)"
          />

          {/* Deterministic line */}
          <Line
            type="monotone"
            dataKey="deterministic"
            stroke="#2e7d32"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="5 5"
            name="Deterministic"
          />

          {/* Vertical markers */}
          <ReferenceLine
            x={state.retirementAge}
            stroke="#e53935"
            strokeWidth={2}
            label={{ value: `Retire ${state.retirementAge}`, position: 'top', offset: 5, fill: '#e53935', fontSize: 11 }}
          />
          <ReferenceLine
            x={Math.min(state.person1SsStartAge ?? 67, state.person2SsStartAge ?? 67)}
            stroke="#f57c00"
            strokeWidth={2}
            label={{ value: `SS ${Math.min(state.person1SsStartAge ?? 67, state.person2SsStartAge ?? 67)}`, position: 'top', offset: 20, fill: '#f57c00', fontSize: 11 }}
          />

          <XAxis
            dataKey="age"
            label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
            width={70}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <DragHandleLayer state={state} updateFields={updateFields} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
