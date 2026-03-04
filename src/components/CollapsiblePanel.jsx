import React, { useState } from 'react';

export function CollapsiblePanel({ title, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `panel-body-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  return (
    <div className={`panel ${open ? 'panel-open' : 'panel-closed'}`}>
      <button
        className="panel-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className="panel-title">{title}</span>
        {badge && <span className="panel-badge">{badge}</span>}
        <span className="panel-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div id={bodyId} className="panel-body">
          {children}
        </div>
      )}
    </div>
  );
}
