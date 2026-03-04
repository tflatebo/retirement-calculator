/**
 * Groups an array of consecutive integers into [start, end] range pairs.
 * @param {number[]} ages
 * @returns {[number, number][]}
 */
export function groupConsecutive(ages) {
  if (ages.length === 0) return [];
  const ranges = [];
  let start = ages[0];
  let prev = ages[0];
  for (let i = 1; i < ages.length; i++) {
    if (ages[i] !== prev + 1) {
      ranges.push([start, prev]);
      start = ages[i];
    }
    prev = ages[i];
  }
  ranges.push([start, prev]);
  return ranges;
}

/**
 * Formats [start, end] range pairs as a human-readable string.
 * @param {[number, number][]} ranges
 * @returns {string}
 */
export function formatRanges(ranges) {
  return ranges.map(([s, e]) => (s === e ? `${s}` : `${s}–${e}`)).join(', ');
}
