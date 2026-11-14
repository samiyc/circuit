/**
 * The corners of a line and where another line takes their apex (the check of P2, docs/recherche/pistes.md, and
 * docs/recherche/questions.md § 4, question 4: before a long straight, the apex comes later). A corner is a run of
 * points where the reference line bends more than `threshold` the same way; its apex, for a line, is the middle of the
 * stretch where that line comes nearest the inside edge. Pure: offsets and bounds in, numbers out.
 * @typedef {import("../types.js").Bounds} Bounds
 * @typedef {{ from: number, to: number, sign: number }} Corner
 */

/**
 * The runs of the closed line's points bending more than `threshold` the same way, `minimum` points long at least.
 * @param {Float64Array} curvature
 * @param {{ threshold?: number, minimum?: number }} [options]
 * @returns {Corner[]}
 */
export function findCorners(curvature, options = {}) {
  const { threshold, minimum } = { threshold: 1 / 400, minimum: 3, ...options };
  const n = curvature.length;
  const signs = Int8Array.from(curvature, (k) => (Math.abs(k) > threshold ? Math.sign(k) : 0));
  const begin = signs.indexOf(0);
  if (begin < 0) return [];
  return runsOf(signs, begin)
    .filter((run) => run.length >= minimum)
    .map(({ start, length, sign }) => ({ from: start % n, to: (start + length - 1) % n, sign }));
}

/** The runs of equal non-zero signs, scanned once round the loop from `begin`, a zero: no run crosses it. */
function runsOf(signs, begin) {
  const n = signs.length;
  const runs = [];
  let k = 0;
  while (k < n) {
    const start = begin + k;
    const sign = signs[start % n];
    let length = 1;
    while (k + length < n && signs[(start + length) % n] === sign) length += 1;
    if (sign !== 0) runs.push({ start, length, sign });
    k += length;
  }
  return runs;
}

/**
 * The distance along the closed line from each point to point 0.
 * @param {Float64Array} step
 * @returns {Float64Array}
 */
export function along(step) {
  const out = new Float64Array(step.length);
  for (let i = 1; i < step.length; i += 1) out[i] = out[i - 1] + step[i - 1];
  return out;
}

/**
 * The apex of a corner for a line: the middle of the points, within `pad` points of the corner, that come within
 * `tolerance` metres of the line's nearest approach to the inside edge.
 * @param {Corner} corner
 * @param {Float64Array} offsets
 * @param {Bounds} bounds
 * @param {{ pad?: number, tolerance?: number }} [options]
 * @returns {number} the index of the apex
 */
export function apexOf({ from, to, sign }, offsets, { lower, upper }, { pad = 10, tolerance = 0.05 } = {}) {
  const n = offsets.length;
  const span = ((to - from + n) % n) + 1 + 2 * pad;
  const gap = (i) => (sign > 0 ? upper[i] - offsets[i] : offsets[i] - lower[i]);
  let nearest = Infinity;
  for (let k = 0; k < span; k += 1) nearest = Math.min(nearest, gap((from - pad + k + n) % n));
  let first = -1;
  let last = -1;
  for (let k = 0; k < span; k += 1) {
    if (gap((from - pad + k + n) % n) > nearest + tolerance) continue;
    if (first < 0) first = k;
    last = k;
  }
  return (from - pad + Math.round((first + last) / 2) + n) % n;
}

/**
 * For each corner: the apex of the reference line and of the other, the shift between them (positive: the other
 * takes it later), the speed the other gains at the corner's exit (its last point), and the length of straight after
 * the corner, to the next one. Distances in metres along the track, speeds in m/s.
 * @param {Corner[]} corners
 * @param {{ reference: Float64Array, line: Float64Array, bounds: Bounds, distance: Float64Array, length: number, speeds: { reference: Float64Array, line: Float64Array } }} lines
 */
export function apexShifts(corners, { reference, line, bounds, distance, length, speeds }) {
  const wrap = (d) => ((d % length) + 1.5 * length) % length - length / 2;
  return corners.map((corner, k) => {
    const next = corners[(k + 1) % corners.length];
    const apexReference = apexOf(corner, reference, bounds);
    const apexLine = apexOf(corner, line, bounds);
    const straightAfter = (distance[next.from] - distance[corner.to] + length) % length;
    const exitGain = speeds.line[corner.to] - speeds.reference[corner.to];
    return { ...corner, apexReference, apexLine, shift: wrap(distance[apexLine] - distance[apexReference]), exitGain, straightAfter };
  });
}
