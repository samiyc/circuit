import { placeLine } from "./line.js";

/**
 * The two scores of the reference lines, as functions of the offsets with their gradients (docs/modele.md, § 4): the
 * length of the closed line, and its bending energy ∫κ²·ds, the squared Menger curvature at each point (the curvature
 * the speed profile reads, src/geometry.js) times the half steps around it. Each gradient goes from a point's position
 * to its offset through the point's left normal.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("./descent.js").Objective} Objective
 */

/**
 * The length of the line: ∂L/∂αⱼ = nⱼ·(uⱼ₋₁ − uⱼ), u the unit step.
 * @param {Track} track
 * @returns {Objective}
 */
export function lengthObjective(track) {
  const { count, nx, ny } = track;
  const px = new Float64Array(count);
  const py = new Float64Array(count);
  return (offsets, gradient) => {
    placeLine(track, offsets, px, py);
    gradient.fill(0);
    let length = 0;
    for (let i = 0; i < count; i += 1) {
      const next = i + 1 < count ? i + 1 : 0;
      const dx = px[next] - px[i];
      const dy = py[next] - py[i];
      const step = Math.sqrt(dx * dx + dy * dy);
      length += step;
      if (step === 0) continue;
      gradient[next] += (dx * nx[next] + dy * ny[next]) / step;
      gradient[i] -= (dx * nx[i] + dy * ny[i]) / step;
    }
    return length;
  };
}

/**
 * The bending energy Σ κᵢ²·wᵢ, wᵢ = (|a| + |b|) / 2, with κ = 2·(a × b) / (|a|·|b|·|c|), a = pᵢ − pᵢ₋₁, b = pᵢ₊₁ − pᵢ,
 * c = a + b. Weighting by the steps makes it a score per metre, not per point: per point, a wide line that spreads a
 * bend over longer steps scores too well (docs/modele.md, § 4, the measure of 14/11).
 * @param {Track} track
 * @returns {Objective}
 */
export function curvatureObjective(track) {
  const { count } = track;
  const px = new Float64Array(count);
  const py = new Float64Array(count);
  const term = new Array(11).fill(0);
  const indices = new Int32Array(3);
  return (offsets, gradient) => {
    placeLine(track, offsets, px, py);
    gradient.fill(0);
    let sum = 0;
    for (let i = 0; i < count; i += 1) {
      indices[0] = i > 0 ? i - 1 : count - 1;
      indices[1] = i;
      indices[2] = i + 1 < count ? i + 1 : 0;
      fillSteps(px, py, indices, term);
      fillCurvature(term);
      sum += spread(track, indices, term, gradient);
    }
    return sum;
  };
}

/**
 * The steps around point i into term[0..3]: a = pᵢ − pᵢ₋₁, b = pᵢ₊₁ − pᵢ (src/line/curvature-model.js reads them too).
 * @param {Float64Array} px
 * @param {Float64Array} py
 * @param {Int32Array} indices the previous point, this one, the next
 * @param {number[]} term
 */
export function fillSteps(px, py, indices, term) {
  const h = indices[0];
  const i = indices[1];
  const j = indices[2];
  term[0] = px[i] - px[h];
  term[1] = py[i] - py[h];
  term[2] = px[j] - px[i];
  term[3] = py[j] - py[i];
}

/**
 * κ into term[4] and ∂κ/∂p at the previous, this and the next point into term[5..10]: ∂(a × b)/den − κ·∂ln(den).
 * @param {number[]} term
 */
export function fillCurvature(term) {
  const [ax, ay, bx, by] = term;
  const cx = ax + bx;
  const cy = ay + by;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const den = Math.sqrt(a2 * b2 * c2);
  if (den === 0) {
    term.fill(0, 4);
    return;
  }
  const k = (2 * (ax * by - ay * bx)) / den;
  term[4] = k;
  term[5] = (-2 * by) / den + k * (ax / a2 + cx / c2);
  term[6] = (2 * bx) / den + k * (ay / a2 + cy / c2);
  term[7] = (2 * cy) / den - k * (ax / a2 - bx / b2);
  term[8] = (-2 * cx) / den - k * (ay / a2 - by / b2);
  term[9] = (-2 * ay) / den - k * (bx / b2 + cx / c2);
  term[10] = (2 * ax) / den - k * (by / b2 + cy / c2);
}

/**
 * Adds ∂(κ²·w)/∂α at the three points to the gradient: 2κ·w·∂κ + κ²·∂w, ∂w = (−uₐ, uₐ − u_b, u_b) / 2.
 * @returns {number} κ²·w
 */
function spread({ nx, ny }, indices, term, gradient) {
  const la = Math.sqrt(term[0] * term[0] + term[1] * term[1]) || 1;
  const lb = Math.sqrt(term[2] * term[2] + term[3] * term[3]) || 1;
  const k = term[4];
  const weight = (la + lb) / 2;
  const half = (k * k) / 2;
  const scale = 2 * k * weight;
  const uax = term[0] / la;
  const uay = term[1] / la;
  const ubx = term[2] / lb;
  const uby = term[3] / lb;
  const h = indices[0];
  const i = indices[1];
  const j = indices[2];
  gradient[h] += (scale * term[5] - half * uax) * nx[h] + (scale * term[6] - half * uay) * ny[h];
  gradient[i] += (scale * term[7] + half * (uax - ubx)) * nx[i] + (scale * term[8] + half * (uay - uby)) * ny[i];
  gradient[j] += (scale * term[9] + half * ubx) * nx[j] + (scale * term[10] + half * uby) * ny[j];
  return k * k * weight;
}
