/**
 * A projected gradient descent in a box, accelerated (FISTA, Beck and Teboulle 2009) with a backtracking step and a
 * restart of the momentum whenever the value rises (O'Donoghue and Candès 2015). It finds the shortest and the
 * minimum-curvature lines of P1 without a QP solver (docs/recherche/pistes.md, P1; the QP comes with P4, in the
 * library). Deterministic: no draw.
 * @typedef {import("../types.js").Bounds} Bounds
 */

/**
 * The value at x, the gradient written into `gradient`.
 * @callback Objective
 * @param {Float64Array} x
 * @param {Float64Array} gradient
 * @returns {number}
 */

/**
 * @typedef {object} DescentOptions
 * @property {number} [iterations] at most, 20 000 by default
 * @property {number} [tolerance] stop when `window` iterations gain less than this share of the value, 1e-7
 * @property {number} [window] 50 by default
 * @property {number} [lipschitz] the first guess of the gradient's Lipschitz constant, 1 by default
 */

const DEFAULTS = Object.freeze({ iterations: 20000, tolerance: 1e-7, window: 50, lipschitz: 1 });

/**
 * Minimises `objective` from `x` (clamped first) within the bounds, in place.
 * @param {Objective} objective
 * @param {Float64Array} x
 * @param {Bounds} bounds
 * @param {DescentOptions} [options]
 * @returns {{ value: number, iterations: number, evaluations: number }}
 */
export function descend(objective, x, bounds, options = {}) {
  const { iterations, tolerance, window, lipschitz } = { ...DEFAULTS, ...options };
  const state = createState(objective, x, bounds, lipschitz);
  let done = 0;
  let gained = true;
  while (done < iterations && gained) {
    const checkpoint = state.value;
    const rounds = Math.min(window, iterations - done);
    for (let k = 0; k < rounds; k += 1) step(state);
    done += rounds;
    gained = checkpoint - state.value > tolerance * Math.abs(state.value);
  }
  return { value: state.value, iterations: done, evaluations: state.evaluations };
}

function createState(objective, x, bounds, lipschitz) {
  const n = x.length;
  project(x, x, bounds);
  const gradient = new Float64Array(n);
  const state = {
    objective,
    bounds,
    x,
    y: Float64Array.from(x),
    trial: new Float64Array(n),
    gradient,
    scratch: new Float64Array(n),
    value: objective(x, gradient),
    lipschitz,
    momentum: 1,
    evaluations: 1,
  };
  return state;
}

/** One accelerated step from y; a step that would raise the value restarts the momentum from x instead. */
function step(state) {
  const trialValue = backtrack(state);
  if (trialValue > state.value) {
    state.momentum = 1;
    state.y.set(state.x);
    return;
  }
  const next = (1 + Math.sqrt(1 + 4 * state.momentum * state.momentum)) / 2;
  const pull = (state.momentum - 1) / next;
  const { x, y, trial } = state;
  for (let i = 0; i < x.length; i += 1) {
    y[i] = trial[i] + pull * (trial[i] - x[i]);
    x[i] = trial[i];
  }
  state.value = trialValue;
  state.momentum = next;
  state.lipschitz *= 0.9;
}

/**
 * The projected step from y with the smallest Lipschitz guess (doubled until it holds) under which the quadratic
 * model bounds the value: f(trial) ≤ f(y) + ∇f(y)·d + L/2·|d|².
 * @returns {number} the value at the trial point
 */
function backtrack(state) {
  const { objective, y, trial, gradient, scratch } = state;
  const base = objective(y, gradient);
  state.evaluations += 1;
  // 200 doublings take any finite guess past 1e60: the step is then nil, and a value that is not a number ends it.
  for (let doublings = 0; ; doublings += 1) {
    const inverse = 1 / state.lipschitz;
    for (let i = 0; i < y.length; i += 1) trial[i] = y[i] - inverse * gradient[i];
    project(trial, trial, state.bounds);
    const value = objective(trial, scratch);
    state.evaluations += 1;
    if (value <= base + model(y, trial, gradient, state.lipschitz) || doublings === 200) return value;
    state.lipschitz *= 2;
  }
}

/** ∇f(y)·d + L/2·|d|², d = trial − y. */
function model(y, trial, gradient, lipschitz) {
  let linear = 0;
  let squared = 0;
  for (let i = 0; i < y.length; i += 1) {
    const d = trial[i] - y[i];
    linear += gradient[i] * d;
    squared += d * d;
  }
  return linear + (lipschitz / 2) * squared;
}

/** Clamps `from` into the bounds, into `to`. */
function project(from, to, { lower, upper }) {
  for (let i = 0; i < from.length; i += 1) to[i] = Math.min(upper[i], Math.max(lower[i], from[i]));
}
