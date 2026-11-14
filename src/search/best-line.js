import { searchCoarseToFine } from "./refine.js";
import { descendLapTime } from "./time-descent.js";

/**
 * The best line measured (docs/ligne-cmaes.md, § 8): the climb from coarse to fine, genes every 40 m, then 20 m, then
 * 10 m, from the minimum-curvature line, then the lap-time descent from its line, each on `budget` lap times. About
 * 20 s a track at 100 000. Seeded: the same seed gives the same lines.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Car} Car
 * @typedef {import("../types.js").Bounds} Bounds
 */

/** The spacings of the stages, m. */
export const STAGES = Object.freeze([40, 20, 10]);

/**
 * @param {{ track: Track, car: Car, bounds: Bounds, base: Float64Array }} problem base: the minimum-curvature line
 * @param {{ budget?: number, seed?: number }} [options]
 * @returns {{ search: Float64Array, best: Float64Array, searchTime: number, bestTime: number }}
 */
export function bestLine(problem, { budget = 100000, seed = 1 } = {}) {
  const search = searchCoarseToFine(problem, { spacings: [...STAGES], budget, seed });
  const best = descendLapTime(problem, { start: search.offsets, budget });
  return { search: search.offsets, best: best.offsets, searchTime: search.time, bestTime: best.time };
}
