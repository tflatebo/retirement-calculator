import { describe, it, expect } from 'vitest';
import { groupConsecutive, formatRanges } from './ranges.js';

describe('groupConsecutive', () => {
  it('returns empty array for empty input', () => {
    expect(groupConsecutive([])).toEqual([]);
  });

  it('groups a single value as a [start, end] pair', () => {
    expect(groupConsecutive([5])).toEqual([[5, 5]]);
  });

  it('groups fully consecutive values into one range', () => {
    expect(groupConsecutive([1, 2, 3, 4, 5])).toEqual([[1, 5]]);
  });

  it('groups non-consecutive values into separate ranges', () => {
    expect(groupConsecutive([1, 2, 5, 6, 10])).toEqual([[1, 2], [5, 6], [10, 10]]);
  });

  it('handles a gap of exactly 2', () => {
    expect(groupConsecutive([3, 5])).toEqual([[3, 3], [5, 5]]);
  });

  it('handles all singleton ranges', () => {
    expect(groupConsecutive([10, 20, 30])).toEqual([[10, 10], [20, 20], [30, 30]]);
  });
});

describe('formatRanges', () => {
  it('formats an empty array as empty string', () => {
    expect(formatRanges([])).toBe('');
  });

  it('formats a single-year range as just the number', () => {
    expect(formatRanges([[5, 5]])).toBe('5');
  });

  it('formats a multi-year range with en-dash', () => {
    expect(formatRanges([[1, 5]])).toBe('1–5');
  });

  it('formats multiple ranges separated by comma', () => {
    expect(formatRanges([[1, 2], [5, 6], [10, 10]])).toBe('1–2, 5–6, 10');
  });
});
