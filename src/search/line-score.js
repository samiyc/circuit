import { placeLine } from "../line/line.js";
import { placeGenes } from "../line/spline.js";
import { createProfile, lapTime } from "../profile/profile.js";

/**
 * The score of a line of genes for a search: minus its lap time, the more the better as `climb` and `cmaes` want it.
 * Every buffer is allocated here once: a score allocates nothing (docs/modele.md, § 7). It counts the lines scored.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Car} Car
 * @typedef {import("../line/spline.js").Shape} Shape
 */

/**
 * @param {Track} track
 * @param {Car} car
 * @param {Shape} shape
 */
export function createLineScore(track, car, shape) {
  const offsets = new Float64Array(track.count);
  const points = { x: new Float64Array(track.count), y: new Float64Array(track.count) };
  const profile = createProfile(track.count);
  const scorer = {
    evaluations: 0,
    /** The lap time of a line of genes. @param {ArrayLike<number>} genes @returns {number} s */
    time(genes) {
      placeGenes(shape, genes, offsets);
      placeLine(track, offsets, points.x, points.y);
      scorer.evaluations += 1;
      return lapTime(car, points, profile);
    },
    /** @param {ArrayLike<number>} genes @returns {number} −the lap time */
    score: (genes) => -scorer.time(genes),
    /** The offsets of a line of genes, in a new buffer. @param {ArrayLike<number>} genes */
    offsetsOf(genes) {
      const out = new Float64Array(track.count);
      placeGenes(shape, genes, out);
      return out;
    },
  };
  return scorer;
}
