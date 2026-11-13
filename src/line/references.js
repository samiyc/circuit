import { descend } from "./descent.js";
import { lineBounds } from "./line.js";
import { curvatureObjective, lengthObjective } from "./objectives.js";

/**
 * The three reference lines of P1 (docs/recherche/pistes.md): the centre line, the shortest and the minimum-curvature
 * line, the last two by the projected descent of src/line/descent.js on their score. A line search of J2 must beat the
 * best of them on lap time.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Bounds} Bounds
 * @typedef {import("./descent.js").DescentOptions} DescentOptions
 */

/** The names of the references, in the order of the tables. */
export const REFERENCES = Object.freeze(["centre", "shortest", "minCurvature"]);

/**
 * The centre line: every offset zero, clamped into the bounds where the track is lopsided.
 * @param {Track} track
 * @param {Bounds} bounds
 * @returns {Float64Array}
 */
export function centreLine(track, bounds) {
  const offsets = new Float64Array(track.count);
  for (let i = 0; i < track.count; i += 1) offsets[i] = Math.min(bounds.upper[i], Math.max(bounds.lower[i], 0));
  return offsets;
}

/**
 * The shortest line, from the centre line.
 * @param {Track} track
 * @param {Bounds} bounds
 * @param {DescentOptions} [options]
 * @returns {{ offsets: Float64Array, value: number, iterations: number }}
 */
export function shortestLine(track, bounds, options) {
  const offsets = centreLine(track, bounds);
  const { value, iterations } = descend(lengthObjective(track), offsets, bounds, options);
  return { offsets, value, iterations };
}

/**
 * The minimum-curvature line (the sum of the squared curvatures), from the centre line.
 * @param {Track} track
 * @param {Bounds} bounds
 * @param {DescentOptions} [options]
 * @returns {{ offsets: Float64Array, value: number, iterations: number }}
 */
export function minCurvatureLine(track, bounds, options) {
  const offsets = centreLine(track, bounds);
  const { value, iterations } = descend(curvatureObjective(track), offsets, bounds, options);
  return { offsets, value, iterations };
}

/**
 * The three references of a track, with the bounds they share.
 * @param {Track} track
 * @param {{ halfWidth?: number, descent?: DescentOptions }} [options]
 * @returns {{ bounds: Bounds, centre: Float64Array, shortest: Float64Array, minCurvature: Float64Array }}
 */
export function referenceLines(track, { halfWidth, descent } = {}) {
  const bounds = lineBounds(track, halfWidth);
  return {
    bounds,
    centre: centreLine(track, bounds),
    shortest: shortestLine(track, bounds, descent).offsets,
    minCurvature: minCurvatureLine(track, bounds, descent).offsets,
  };
}
