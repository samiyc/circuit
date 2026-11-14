import { createShape, fitGenes, placeGenes } from "../line/spline.js";
import { createLineScore } from "./line-score.js";
import { searchClimb } from "./line-search.js";

/**
 * From coarse to fine (P3, docs/recherche/pistes.md): the climb on genes every `spacings[0]` metres, then the line it
 * found fitted on finer genes and climbed again, and so on, the budget shared equally between the stages. Each stage
 * starts from the best line of the one before, so the finest stage never starts worse than it (up to the fit).
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Car} Car
 * @typedef {import("../types.js").Bounds} Bounds
 */

/**
 * @param {{ track: Track, car: Car, bounds: Bounds, base: Float64Array }} problem
 * @param {{ spacings: number[], budget: number, seed: number, every?: number }} options
 * @returns {{ offsets: Float64Array, time: number, evaluations: number, curve: number[], genes: number }}
 */
export function searchCoarseToFine({ track, car, bounds, base }, { spacings, budget, seed, every = 1000 }) {
  const share = Math.floor(budget / spacings.length);
  let offsets = Float64Array.from(base);
  let result = null;
  let evaluations = 0;
  const curve = [];
  let shape = null;
  for (const [stage, spacing] of spacings.entries()) {
    shape = createShape(track, bounds, { spacing, base });
    const start = stage === 0 ? new Float64Array(shape.genes) : fitGenes(shape, offsets);
    result = searchClimb(createLineScore(track, car, shape), { start, budget: share, seed: seed + stage, every });
    evaluations += result.evaluations;
    curve.push(...result.curve);
    offsets = new Float64Array(track.count);
    placeGenes(shape, result.genes, offsets);
  }
  return { offsets, time: result.time, evaluations, curve, genes: shape.genes };
}
