import { placeLine } from "./line.js";
import { fillCurvature, fillSteps } from "./objectives.js";

/**
 * The curvature of a line linearised in its offsets, and the convex model of one step of the lap-time descent (P4,
 * docs/ligne-cmaes.md, § 8): the lap time's gradient g, plus a stiffness c times the bending of the step,
 *
 *   m(d) = gᵀd + ½·c·(Σᵢ dsᵢ·(Jd)ᵢ² + δ·|d|²),   (Jd)ᵢ = ∂κᵢ/∂αᵢ₋₁·dᵢ₋₁ + ∂κᵢ/∂αᵢ·dᵢ + ∂κᵢ/∂αᵢ₊₁·dᵢ₊₁,
 *
 * so a step that bends the line costs what its curvature costs (the metric of the minimum-curvature line), and δ keeps
 * the model strictly convex where the line is straight. Pure: offsets in, numbers out.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("./descent.js").Objective} Objective
 * @typedef {{ jacobian: Float64Array, steps: Float64Array }} CurvatureModel  three entries of J a point, and dsᵢ
 */

/**
 * @param {Track} track
 * @param {Float64Array} offsets
 * @returns {CurvatureModel}
 */
export function curvatureModel(track, offsets) {
  const { count, nx, ny } = track;
  const px = new Float64Array(count);
  const py = new Float64Array(count);
  placeLine(track, offsets, px, py);
  const jacobian = new Float64Array(3 * count);
  const steps = new Float64Array(count);
  const indices = new Int32Array(3);
  const term = new Array(11).fill(0);
  for (let i = 0; i < count; i += 1) {
    indices[0] = i > 0 ? i - 1 : count - 1;
    indices[1] = i;
    indices[2] = i + 1 < count ? i + 1 : 0;
    fillSteps(px, py, indices, term);
    fillCurvature(term);
    for (let q = 0; q < 3; q += 1) jacobian[3 * i + q] = term[5 + 2 * q] * nx[indices[q]] + term[6 + 2 * q] * ny[indices[q]];
    steps[i] = (Math.sqrt(term[0] * term[0] + term[1] * term[1]) + Math.sqrt(term[2] * term[2] + term[3] * term[3])) / 2;
  }
  return { jacobian, steps };
}

/**
 * The step's model m(d) as an objective for `descend`, its gradient g + c·(Jᵀ·diag(ds)·J·d + δ·d).
 * @param {Float64Array} gradient the lap time's, s/m
 * @param {CurvatureModel} model
 * @param {{ stiffness: number, damping: number }} weights c and δ
 * @returns {Objective}
 */
export function stepObjective(gradient, { jacobian, steps }, { stiffness, damping }) {
  const count = steps.length;
  const bend = new Float64Array(count);
  return (d, out) => {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      const h = i > 0 ? i - 1 : count - 1;
      const j = i + 1 < count ? i + 1 : 0;
      bend[i] = jacobian[3 * i] * d[h] + jacobian[3 * i + 1] * d[i] + jacobian[3 * i + 2] * d[j];
      value += gradient[i] * d[i] + 0.5 * stiffness * (steps[i] * bend[i] * bend[i] + damping * d[i] * d[i]);
      out[i] = gradient[i] + stiffness * damping * d[i];
    }
    for (let i = 0; i < count; i += 1) {
      const h = i > 0 ? i - 1 : count - 1;
      const j = i + 1 < count ? i + 1 : 0;
      const w = stiffness * steps[i] * bend[i];
      out[h] += w * jacobian[3 * i];
      out[i] += w * jacobian[3 * i + 1];
      out[j] += w * jacobian[3 * i + 2];
    }
    return value;
  };
}
