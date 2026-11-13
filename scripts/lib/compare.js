/**
 * How far one closed line lies from another: for each point of the first, the distance to the nearest segment of the
 * second (brute force, a measure, not a hot path).
 * @typedef {import("../../src/types.js").Points} Points
 */

/**
 * The distance from a point to the segment from (ax, ay) to (bx, by).
 * @param {number[]} point
 * @param {number[]} segment ax, ay, bx, by
 * @returns {number}
 */
function toSegment([px, py], [ax, ay, bx, by]) {
  const ex = bx - ax;
  const ey = by - ay;
  const squared = ex * ex + ey * ey;
  const t = squared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / squared));
  return Math.hypot(px - ax - t * ex, py - ay - t * ey);
}

/**
 * The distance from each point of `line` to the closed polyline `reference`, its mean and its maximum.
 * @param {Points} line
 * @param {Points} reference
 * @returns {{ mean: number, max: number }} m
 */
export function lineGap(line, reference) {
  const count = reference.x.length;
  let sum = 0;
  let max = 0;
  for (let i = 0; i < line.x.length; i += 1) {
    let nearest = Infinity;
    for (let j = 0; j < count; j += 1) {
      const k = j + 1 < count ? j + 1 : 0;
      const segment = [reference.x[j], reference.y[j], reference.x[k], reference.y[k]];
      nearest = Math.min(nearest, toSegment([line.x[i], line.y[i]], segment));
    }
    sum += nearest;
    max = Math.max(max, nearest);
  }
  return { mean: sum / line.x.length, max };
}
