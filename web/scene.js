import { along, apexShifts, findCorners } from "../src/analysis/corners.js";
import { boxAround, boxOf } from "../src/view/frame.js";
import { timeGap } from "../src/view/lap.js";

/**
 * What the page derives from a track and two of its lines (J3): the distance along the centre line, the gap of B on A
 * point by point, the corners (found on the minimum-curvature line, the same for every pair) with A's and B's apexes,
 * the speed range of the colours, and the boxes to show, the whole track or one corner.
 * @typedef {import("../src/types.js").Track} Track
 * @typedef {import("../src/types.js").Bounds} Bounds
 * @typedef {import("../src/view/lap.js").Lap} Lap
 * @typedef {import("../src/view/frame.js").Box} Box
 */

/**
 * The distance along the centre line at each point, n + 1 entries, the last the lap's length.
 * @param {Lap} centre
 * @returns {Float64Array}
 */
export function distanceOf(centre) {
  const { step, count } = centre.profile;
  const inner = along(step);
  const out = new Float64Array(count + 1);
  out.set(inner);
  out[count] = inner[count - 1] + step[count - 1];
  return out;
}

/**
 * The box around the track's edges.
 * @param {Track} track
 * @returns {Box}
 */
export function trackBox({ x, y, nx, ny, wLeft, wRight }) {
  const left = { x: x.map((v, i) => v + nx[i] * wLeft[i]), y: y.map((v, i) => v + ny[i] * wLeft[i]) };
  const right = { x: x.map((v, i) => v - nx[i] * wRight[i]), y: y.map((v, i) => v - ny[i] * wRight[i]) };
  return boxOf(left, right);
}

/**
 * A pair of lines: A in colour, B in a thread.
 * @param {{ track: Track, bounds: Bounds, laps: Record<string, Lap>, offsets: Record<string, Float64Array>, distance: Float64Array }} base
 * @param {string} a
 * @param {string} b
 */
export function pairOf({ laps, offsets, bounds, distance }, a, b) {
  const [lapA, lapB] = [laps[a], laps[b]];
  const length = distance[distance.length - 1];
  const corners = apexShifts(findCorners(laps.minCurvature.profile.curvature), {
    reference: offsets[b],
    line: offsets[a],
    bounds,
    distance: distance.subarray(0, distance.length - 1),
    length,
    speeds: { reference: lapB.profile.speed, line: lapA.profile.speed },
  });
  let low = Infinity;
  let high = 0;
  for (const speed of [...lapA.profile.speed, ...lapB.profile.speed]) {
    low = Math.min(low, speed);
    high = Math.max(high, speed);
  }
  return { a: lapA, b: lapB, gap: timeGap(lapA, lapB), corners, low, high };
}

/**
 * The view of one corner: a box around it on the track, and the window of points for the profile.
 * @param {Track} track
 * @param {{ from: number, to: number }} corner
 * @param {Float64Array} distance
 * @returns {{ box: Box, from: number, to: number, length: number }}
 */
export function cornerView(track, { from, to }, distance) {
  const n = track.count;
  const span = to >= from ? to - from : to + n - from;
  const indices = Array.from({ length: span + 41 }, (_, k) => (from - 20 + k + n) % n);
  const box = boxOf({ x: indices.map((i) => track.x[i]), y: indices.map((i) => track.y[i]) });
  const side = Math.max(box.maxX - box.minX, box.maxY - box.minY, 80) / 2 + 25;
  const square = boxAround((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, side);
  return { box: square, from: Math.max(0, from - 50), to: Math.min(n, from + span + 70), length: distance[n] };
}
