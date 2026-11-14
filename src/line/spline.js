import { descend } from "./descent.js";

/**
 * A line as genes (docs/recherche/pistes.md, P2 and P3): one gene a control point, about every `spacing` metres along
 * the centre line, an offset in units of `scale` metres (the mean half room of the track, so that a step of 0.3 moves
 * a line by about a third of it). A periodic uniform cubic B-spline of the genes gives each track point an offset
 * from a smooth base line (the minimum-curvature line), smooth by construction (C²), the sum clamped into the bounds.
 * The base matters: TU Munich's centre lines, at 5 m, are noisy, and a smooth line keeps centimetre wiggles against
 * them that no spline of a few genes can draw (docs/ligne-cmaes.md, § 1). Not a share of the local width: TU Munich's widths come
 * from satellite images and are noisy, and a line drawn as a share of them inherits their noise (docs/ligne-cmaes.md, § 1).
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Bounds} Bounds
 */

/**
 * @typedef {object} Shape
 * @property {number} genes
 * @property {number} count the track's points
 * @property {Int32Array} first the first of the four genes blended at each point
 * @property {Float64Array} weights the four weights at each point, 4·count
 * @property {number} scale metres per unit of a gene
 * @property {Float64Array} base the offsets of the line of genes all zero
 * @property {Float64Array} lower the bounds of the offsets
 * @property {Float64Array} upper
 */

/** The four uniform cubic B-spline weights at u ∈ [0, 1), into `weights` from `at`. */
function basis(u, weights, at) {
  const u2 = u * u;
  const u3 = u2 * u;
  weights[at] = (1 - u) ** 3 / 6;
  weights[at + 1] = (3 * u3 - 6 * u2 + 4) / 6;
  weights[at + 2] = (-3 * u3 + 3 * u2 + 3 * u + 1) / 6;
  weights[at + 3] = u3 / 6;
}

/** The distance along the closed centre line to each point, and the whole length. */
function arcLengths(track) {
  const along = new Float64Array(track.count);
  let length = 0;
  for (let i = 0; i < track.count; i += 1) {
    along[i] = length;
    const next = i + 1 < track.count ? i + 1 : 0;
    length += Math.sqrt((track.x[next] - track.x[i]) ** 2 + (track.y[next] - track.y[i]) ** 2);
  }
  return { along, length };
}

/**
 * The genes of a track's lines: a control point about every `spacing` metres (8 at least), around `base` (the
 * centre line by default).
 * @param {Track} track
 * @param {Bounds} bounds
 * @param {{ spacing: number, base?: Float64Array }} options
 * @returns {Shape}
 */
export function createShape(track, { lower, upper }, { spacing, base = new Float64Array(track.count) }) {
  const { along, length } = arcLengths(track);
  const genes = Math.max(8, Math.round(length / spacing));
  const count = track.count;
  const first = new Int32Array(count);
  const weights = new Float64Array(4 * count);
  for (let i = 0; i < count; i += 1) {
    const t = (along[i] / length) * genes;
    const segment = Math.floor(t);
    first[i] = (segment - 1 + genes) % genes;
    basis(t - segment, weights, 4 * i);
  }
  let room = 0;
  for (let i = 0; i < count; i += 1) room += (upper[i] - lower[i]) / 2;
  return { genes, count, first, weights, scale: Math.max(room / count, 1e-9), base, lower, upper };
}

/**
 * The offsets of a line of genes, into `offsets`, each clamped into its bounds.
 * @param {Shape} shape
 * @param {ArrayLike<number>} genes
 * @param {Float64Array} offsets
 */
export function placeGenes({ genes: n, count, first, weights, scale, base, lower, upper }, genes, offsets) {
  for (let i = 0; i < count; i += 1) {
    let offset = 0;
    for (let k = 0; k < 4; k += 1) offset += weights[4 * i + k] * genes[(first[i] + k) % n];
    offset = base[i] + offset * scale;
    offsets[i] = Math.min(upper[i], Math.max(lower[i], offset));
  }
}

/**
 * The offsets of a line of genes before the bounds clamp them, into `offsets`.
 * @param {Shape} shape
 * @param {ArrayLike<number>} genes
 * @param {Float64Array} offsets
 */
function freeOffsets({ genes: n, count, first, weights, scale, base }, genes, offsets) {
  for (let i = 0; i < count; i += 1) {
    let offset = 0;
    for (let k = 0; k < 4; k += 1) offset += weights[4 * i + k] * genes[(first[i] + k) % n];
    offsets[i] = base[i] + offset * scale;
  }
}

/**
 * The genes whose spline comes nearest a given line, by least squares on the offsets before the clamp (a start for a
 * search from a reference line): the projected descent of the reference lines, on a convex quadratic, unbounded.
 * @param {Shape} shape
 * @param {Float64Array} offsets
 * @returns {Float64Array}
 */
export function fitGenes(shape, offsets) {
  const placed = new Float64Array(shape.count);
  const objective = (genes, gradient) => {
    freeOffsets(shape, genes, placed);
    gradient.fill(0);
    let sum = 0;
    for (let i = 0; i < shape.count; i += 1) {
      const residual = (placed[i] - offsets[i]) / shape.scale;
      sum += residual * residual;
      for (let k = 0; k < 4; k += 1) gradient[(shape.first[i] + k) % shape.genes] += 2 * residual * shape.weights[4 * i + k];
    }
    return sum;
  };
  const genes = new Float64Array(shape.genes);
  const box = { lower: new Float64Array(shape.genes).fill(-Infinity), upper: new Float64Array(shape.genes).fill(Infinity) };
  descend(objective, genes, box, { tolerance: 1e-10 });
  return genes;
}
