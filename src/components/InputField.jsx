import React from 'react';

/**
 * Reusable labeled input field
 */
export function InputField({ label, name, value, onChange, type = 'number', min, max, step, prefix, suffix, helpText }) {
  return (
    <div className="input-field">
      <label className="input-label" htmlFor={name}>
        {label}
        {helpText && <span className="input-help">{helpText}</span>}
      </label>
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => {
            const val = type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
            onChange(name, val);
          }}
          onBlur={() => {
            if (type === 'number') {
              const numVal = value === '' || isNaN(Number(value))
                ? (min !== undefined ? Number(min) : 0)
                : Number(value);
              const clamped = Math.min(
                Math.max(numVal, min !== undefined ? Number(min) : -Infinity),
                max !== undefined ? Number(max) : Infinity
              );
              onChange(name, clamped);
            }
          }}
          className={`input-control ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

export function TextInputField({ label, name, value, onChange, helpText }) {
  return (
    <div className="input-field">
      <label className="input-label" htmlFor={name}>
        {label}
        {helpText && <span className="input-help">{helpText}</span>}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        value={value}
        onChange={e => onChange(name, e.target.value)}
        className="input-control"
      />
    </div>
  );
}
