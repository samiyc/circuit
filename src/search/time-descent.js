import { descend } from "../line/descent.js";
import { curvatureModel, stepObjective } from "../line/curvature-model.js";
import { placeLine } from "../line/line.js";
import { createProfile, lapTime } from "../profile/profile.js";

/**
 * The lap-time descent (P4, docs/ligne-cmaes.md, § 8): from a line, the lap time's gradient in every offset (central
 * differences, 2n lap times), then the step that minimises the convex model of src/line/curvature-model.js within the
 * track, solved by `descend`. A step that lowers the lap time is kept and the stiffness halves; one that does not is
 * dropped and the stiffness quadruples, a trust region. The lap time is not smooth (the profile takes minima), so the
 * steps stay small, millimetres. Deterministic: no draw.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Car} Car
 * @typedef {import("../types.js").Bounds} Bounds
 */

/** The difference step of the gradient, m. */
const STEP = 1e-4;

/** The stiffness beyond which the descent stops: no step it allows moves the line. */
const STIFF = 1e12;

/**
 * The lap time of a line of offsets, counting its calls; allocates once.
 * @param {Track} track
 * @param {Car} car
 */
export function createTimer(track, car) {
  const points = { x: new Float64Array(track.count), y: new Float64Array(track.count) };
  const profile = createProfile(track.count);
  const timer = {
    evaluations: 0,
    /** @param {Float64Array} offsets @returns {number} s */
    time(offsets) {
      placeLine(track, offsets, points.x, points.y);
      timer.evaluations += 1;
      return lapTime(car, points, profile);
    },
  };
  return timer;
}

/**
 * The lap time's gradient by central differences, into `out`; the offsets are left as they were.
 * @param {ReturnType<typeof createTimer>} timer
 * @param {Float64Array} offsets
 * @param {Float64Array} out s/m
 */
export function lapTimeGradient(timer, offsets, out) {
  for (let k = 0; k < offsets.length; k += 1) {
    const value = offsets[k];
    offsets[k] = value + STEP;
    const plus = timer.time(offsets);
    offsets[k] = value - STEP;
    const minus = timer.time(offsets);
    offsets[k] = value;
    out[k] = (plus - minus) / (2 * STEP);
  }
}

/** One step from `state.offsets`: the model's minimum within the track, then its lap time. */
function tryStep(problem, state, settings) {
  const { track, bounds, timer } = problem;
  const n = track.count;
  lapTimeGradient(timer, state.offsets, state.gradient);
  const model = curvatureModel(track, state.offsets);
  const d = new Float64Array(n);
  const box = { lower: Float64Array.from(state.offsets, (o, i) => bounds.lower[i] - o), upper: Float64Array.from(state.offsets, (o, i) => bounds.upper[i] - o) };
  descend(stepObjective(state.gradient, model, { stiffness: state.stiffness, damping: settings.damping }), d, box, { tolerance: 1e-9 });
  const trial = Float64Array.from(state.offsets, (o, i) => o + d[i]);
  const time = timer.time(trial);
  if (time < state.time) {
    state.offsets = trial;
    state.time = time;
    state.stiffness /= 2;
  } else {
    state.stiffness *= 4;
  }
  state.curve.push([timer.evaluations, state.time]);
}

/**
 * @param {{ track: Track, car: Car, bounds: Bounds }} problem
 * @param {{ start: Float64Array, budget: number, stiffness?: number, damping?: number }} options the budget in lap times
 * @returns {{ offsets: Float64Array, time: number, evaluations: number, steps: number, curve: number[][] }} the curve:
 *   [lap times spent, best time] after each step
 */
export function descendLapTime({ track, car, bounds }, { start, budget, stiffness = 1e4, damping = 1e-4 }) {
  const timer = createTimer(track, car);
  const state = { offsets: Float64Array.from(start), time: timer.time(start), gradient: new Float64Array(track.count), stiffness, curve: [] };
  let steps = 0;
  while (timer.evaluations + 2 * track.count + 1 <= budget && state.stiffness < STIFF) {
    tryStep({ track, bounds, timer }, state, { damping });
    steps += 1;
  }
  return { offsets: state.offsets, time: state.time, evaluations: timer.evaluations, steps, curve: state.curve };
}
