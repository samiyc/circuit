/**
 * The road's grip at each point of a line (P8, the rain: docs/pluie.md). On a wet road every force the tyres give
 * drops to `wet` of the dry (calibrated on Pirelli's rule of thumb, WET); and the dry line, where the rubber and the
 * polished asphalt are, is the most slippery in the wet (docs/recherche/questions.md § 4, question 3): on a band around
 * it the grip drops by `drop` more at its centre, smoothly to nothing `half` metres away, (1 − d²/half²)², so that a
 * search feels its slope. Its width and its drop are hypotheses: no source measures them.
 * @typedef {import("../types.js").Surface} Surface
 * @typedef {import("../types.js").Points} Points
 */

/**
 * The share of the dry grip that brings the profile of the best dry line to 111 % of its dry time, the middle of
 * Pirelli's 110 to 112 % where intermediates replace slicks (docs/pluie.md § 1): the median of the 25 tracks, 0.829
 * (0.73 at IMS, an oval, to 0.85 at Brands Hatch).
 */
export const WET = 0.83;

/** The band of the dry line: m to either side (a car's width, 2 m, plus a margin), the grip lost at its centre. */
export const BAND = Object.freeze({ half: 1.5, drop: 0.15 });

/** The grip arrays a surface has filled, to set back to 1 for a dry car. */
const wetted = new WeakSet();

/**
 * Fills `grip` for the line `points` on `surface` (all 1 without one).
 * @param {Surface | undefined} surface
 * @param {Points} points
 * @param {Float64Array} grip
 */
export function fillGrip(surface, { x, y }, grip) {
  if (!surface) {
    if (wetted.has(grip)) {
      grip.fill(1);
      wetted.delete(grip);
    }
    return;
  }
  wetted.add(grip);
  if (!surface.line || !surface.drop) grip.fill(surface.wet);
  else fillBand(surface, { x, y }, grip);
}

/** The band of the dry line. @param {Surface} surface @param {Points} points @param {Float64Array} grip */
function fillBand({ wet, line, half = BAND.half, drop = 0 }, { x, y }, grip) {
  if (line.x.length !== x.length) throw new Error("the dry line and the line scored differ in points");
  const inverse = 1 / (half * half);
  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i] - line.x[i];
    const dy = y[i] - line.y[i];
    const near = Math.max(0, 1 - (dx * dx + dy * dy) * inverse);
    grip[i] = wet * (1 - drop * near * near);
  }
}

/**
 * The car on a surface.
 * @template {import("../types.js").Car} C
 * @param {C} car
 * @param {Surface} surface
 * @returns {C}
 */
export function onSurface(car, surface) {
  return { ...car, surface };
}
