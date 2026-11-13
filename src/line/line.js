/**
 * A line is one offset a track point, in metres along the point's left normal (docs/modele.md, § 4). Its bounds are
 * the track's edges less half the car's width: 1 m by default, an F1 being 2 000 mm wide at most from 2017 to 2025
 * (the TUM F1 is of 2019), with no safety margin. TU Munich's race lines keep 0.75 m (measured on their 25 lines,
 * docs/modele.md, § 5); its optimiser's default is 1.7 m (`width_opt`, params/racecar.ini).
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Bounds} Bounds
 */

/** Half the width of an F1 of 2017-2025, m. */
export const HALF_WIDTH = 1.0;

/** The margin TU Munich's race lines keep from the edges, m (their 5th percentile on every track). */
export const TUM_HALF_WIDTH = 0.75;

/**
 * The offsets a line may take at each point (lower ≤ upper; a point narrower than the car pins it to the middle of
 * what is left).
 * @param {Track} track
 * @param {number} [halfWidth]
 * @returns {Bounds}
 */
export function lineBounds(track, halfWidth = HALF_WIDTH) {
  const lower = new Float64Array(track.count);
  const upper = new Float64Array(track.count);
  for (let i = 0; i < track.count; i += 1) {
    lower[i] = -track.wRight[i] + halfWidth;
    upper[i] = track.wLeft[i] - halfWidth;
    if (lower[i] > upper[i]) {
      const middle = (lower[i] + upper[i]) / 2;
      lower[i] = middle;
      upper[i] = middle;
    }
  }
  return { lower, upper };
}

/**
 * The points of a line, into the given buffers.
 * @param {Track} track
 * @param {Float64Array} offsets
 * @param {Float64Array} x
 * @param {Float64Array} y
 */
export function placeLine(track, offsets, x, y) {
  for (let i = 0; i < track.count; i += 1) {
    x[i] = track.x[i] + offsets[i] * track.nx[i];
    y[i] = track.y[i] + offsets[i] * track.ny[i];
  }
}

/**
 * The points of a line, in new buffers.
 * @param {Track} track
 * @param {Float64Array} offsets
 * @returns {{ x: Float64Array, y: Float64Array }}
 */
export function linePoints(track, offsets) {
  const x = new Float64Array(track.count);
  const y = new Float64Array(track.count);
  placeLine(track, offsets, x, y);
  return { x, y };
}

/**
 * Clamps each offset into its bounds, in place.
 * @param {Float64Array} offsets
 * @param {Bounds} bounds
 */
export function clampOffsets(offsets, { lower, upper }) {
  for (let i = 0; i < offsets.length; i += 1) offsets[i] = Math.min(upper[i], Math.max(lower[i], offsets[i]));
}
