import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent } from './format.js';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats null/undefined/NaN as $0', () => {
    expect(formatCurrency(null)).toBe('$0');
    expect(formatCurrency(undefined)).toBe('$0');
    expect(formatCurrency(NaN)).toBe('$0');
  });

  it('formats a regular integer', () => {
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('formats compact millions', () => {
    expect(formatCurrency(1500000, true)).toBe('$1.5M');
    expect(formatCurrency(2000000, true)).toBe('$2.0M');
  });

  it('formats compact thousands', () => {
    expect(formatCurrency(50000, true)).toBe('$50K');
    expect(formatCurrency(1500, true)).toBe('$2K');
  });

  it('formats compact small amounts', () => {
    expect(formatCurrency(500, true)).toBe('$500');
  });

  it('formats negative compact values', () => {
    expect(formatCurrency(-1500000, true)).toBe('-$1.5M');
    expect(formatCurrency(-50000, true)).toBe('-$50K');
  });

  it('formats non-compact with no decimal places', () => {
    const result = formatCurrency(12345.67);
    expect(result).toBe('$12,346');
  });
});

describe('formatPercent', () => {
  it('formats null/undefined/NaN as 0.0%', () => {
    expect(formatPercent(null)).toBe('0.0%');
    expect(formatPercent(undefined)).toBe('0.0%');
    expect(formatPercent(NaN)).toBe('0.0%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats a percentage with one decimal', () => {
    expect(formatPercent(5.5)).toBe('5.5%');
    expect(formatPercent(12.345)).toBe('12.3%');
  });

  it('formats string numbers', () => {
    expect(formatPercent('3.7')).toBe('3.7%');
  });
});
