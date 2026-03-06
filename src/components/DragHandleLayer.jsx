import { useState, useRef, useCallback, useEffect } from 'react';
import { useXAxisDomain, usePlotArea, ZIndexLayer } from 'recharts';

// Render drag handles above ReferenceLine (400) and tooltip cursor (1100)
const DRAG_HANDLE_Z_INDEX = 1500;

const HANDLE_WIDTH = 14;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function DragHandleLayer({ state, updateFields }) {
  const domain = useXAxisDomain(0);
  const plotArea = usePlotArea();
  const dragRef = useRef(null);
  const svgRef = useRef(null);
  const [ghostAge, setGhostAge] = useState(null);

  // Convert clientX (viewport pixels) to SVG-local X coordinate
  const clientToSvgX = useCallback((clientX) => {
    const svg = svgRef.current;
    if (!svg) return clientX;
    const rect = svg.getBoundingClientRect();
    return clientX - rect.left;
  }, []);

  // SVG-local X to age
  const svgXToAge = useCallback((svgX) => {
    if (!domain || !plotArea || domain.length < 2) return 0;
    const minAge = domain[0];
    const maxAge = domain[domain.length - 1];
    return Math.round(minAge + ((svgX - plotArea.x) / plotArea.width) * (maxAge - minAge));
  }, [domain, plotArea]);

  // Age to SVG-local X
  const ageToSvgX = useCallback((age) => {
    if (!domain || !plotArea || domain.length < 2) return 0;
    const minAge = domain[0];
    const maxAge = domain[domain.length - 1];
    return plotArea.x + ((age - minAge) / (maxAge - minAge)) * plotArea.width;
  }, [domain, plotArea]);

  const commitDrag = useCallback((handle, newAge) => {
    if (handle.type === 'retirement') {
      const newContrib = state.contributionPhases.length > 0
        ? state.contributionPhases.map((p, i) =>
            i === state.contributionPhases.length - 1 ? { ...p, endAge: newAge - 1 } : p
          )
        : state.contributionPhases;
      const newSpending = state.spendingPhases.length > 0
        ? state.spendingPhases.map((p, i) =>
            i === 0 ? { ...p, startAge: newAge } : p
          )
        : state.spendingPhases;
      updateFields({
        retirementAge: newAge,
        contributionPhases: newContrib,
        spendingPhases: newSpending,
      });
    } else if (handle.type === 'phaseEnd') {
      const phases = state.spendingPhases.map((p, i) => {
        if (i === handle.phaseIdx) return { ...p, endAge: newAge };
        if (i === handle.phaseIdx + 1) return { ...p, startAge: newAge + 1 };
        return p;
      });
      updateFields({ spendingPhases: phases });
    } else if (handle.type === 'lastPhaseEnd') {
      const phases = state.spendingPhases.map((p, i) =>
        i === handle.phaseIdx ? { ...p, endAge: newAge } : p
      );
      updateFields({ spendingPhases: phases, endOfPlanAge: newAge });
    }
  }, [state, updateFields]);

  // Use window-level mousemove/mouseup listeners for drag (works with Playwright + pointer capture)
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragRef.current) return;
      const svgX = clientToSvgX(e.clientX);
      const newAge = clamp(svgXToAge(svgX), dragRef.current.minAge, dragRef.current.maxAge);
      setGhostAge(newAge);
    };

    const onMouseUp = (e) => {
      if (!dragRef.current) return;
      const svgX = clientToSvgX(e.clientX);
      const newAge = clamp(svgXToAge(svgX), dragRef.current.minAge, dragRef.current.maxAge);
      commitDrag(dragRef.current, newAge);
      dragRef.current = null;
      setGhostAge(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [clientToSvgX, svgXToAge, commitDrag]);

  const onMouseDown = useCallback((e, handle) => {
    e.stopPropagation();
    e.preventDefault();
    // Capture the SVG element reference for coordinate conversion
    const svg = e.currentTarget.closest?.('svg') ?? e.currentTarget.ownerSVGElement;
    svgRef.current = svg;
    dragRef.current = { ...handle };
    setGhostAge(handle.currentAge);
  }, []);

  if (!domain || !plotArea) return null;

  const chartTop = plotArea.y;
  const chartHeight = plotArea.height;
  const phases = state.spendingPhases;

  // Build handle definitions
  const handles = [];

  // Retirement age handle
  handles.push({
    type: 'retirement',
    currentAge: state.retirementAge,
    minAge: state.person1Age + 1,
    maxAge: phases.length > 0 ? phases[0].endAge : state.endOfPlanAge - 1,
    testId: 'drag-handle-retirement',
  });

  // Internal phase boundary handles
  for (let i = 0; i < phases.length - 1; i++) {
    handles.push({
      type: 'phaseEnd',
      phaseIdx: i,
      currentAge: phases[i].endAge,
      minAge: phases[i].startAge + 1,
      maxAge: phases[i + 1].endAge - 1,
      testId: `drag-handle-phase-${i}-end`,
    });
  }

  // Last phase end handle
  if (phases.length > 0) {
    const lastIdx = phases.length - 1;
    handles.push({
      type: 'lastPhaseEnd',
      phaseIdx: lastIdx,
      currentAge: phases[lastIdx].endAge,
      minAge: phases[lastIdx].startAge + 1,
      maxAge: Math.max(phases[lastIdx].startAge + 2, state.endOfPlanAge + 5),
      testId: `drag-handle-phase-${lastIdx}-end`,
    });
  }

  return (
    <ZIndexLayer zIndex={DRAG_HANDLE_Z_INDEX}>
      <g>
        {/* Ghost line during drag */}
        {ghostAge != null && (
          <line
            x1={ageToSvgX(ghostAge)}
            x2={ageToSvgX(ghostAge)}
            y1={chartTop}
            y2={chartTop + chartHeight}
            stroke="#666"
            strokeWidth={2}
            strokeDasharray="4 3"
            pointerEvents="none"
          />
        )}
        {/* Drag handles */}
        {handles.map((h) => (
          <rect
            key={h.testId}
            data-testid={h.testId}
            x={ageToSvgX(h.currentAge) - HANDLE_WIDTH / 2}
            y={chartTop}
            width={HANDLE_WIDTH}
            height={chartHeight}
            className="drag-handle-rect"
            onMouseDown={(e) => onMouseDown(e, h)}
          />
        ))}
      </g>
    </ZIndexLayer>
  );
}
