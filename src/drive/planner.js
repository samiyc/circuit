import { createClimb } from "mcts-commun/climb.js";
import { createRng } from "mcts-commun/random.js";
import { stepCar } from "./bicycle.js";
import { TUNED, createPursuit, nearestPoint, pursue } from "./pursuit.js";
import { TICK, pastEdge } from "./run.js";

/**
 * P7, the driver by search (docs/pilote.md § 9): the tuned pure-pursuit driver, corrected by a plan that the
 * library's hill climb improves at every segment, as Mad Pod Racing's bots do (a plan over the next turns, the last
 * best shifted a segment). A plan is, for each segment, a steering offset and a pedal offset added to the rule's
 * controls; the plan of zeros is the rule, where each search starts. A plan is scored by a rollout of the horizon from
 * the car's state: the metres gained along the line, less the metres the car would need at the end to brake back to
 * the profile, less a fine for each tick off the track or sliding. Seeded: a lap replays from its seed.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("./pursuit.js").Path} Path
 * @typedef {import("./bicycle.js").Bicycle} Bicycle
 * @typedef {import("./bicycle.js").CarState} CarState
 * @typedef {{ segments: number, segment: number, budget: number, steer: number, pedal: number, brake: number, offFine: number, slideFine: number, stray: number }} PlannerSettings
 */

/** @type {Readonly<PlannerSettings>} */
export const PLANNER = Object.freeze({
  segments: 6, // the horizon, in segments
  segment: 0.25, // s, a segment: the plan's step, and how often the search runs
  budget: 40, // plans scored at each search
  steer: 0.02, // rad of steering offset per unit of gene
  pedal: 0.3, // pedal offset per unit of gene
  brake: 30, // m/s², the deceleration the end of the horizon is judged by (a hypothesis, below an F1's 4 to 5 g)
  offFine: 2, // m a tick off the track
  slideFine: 2, // m a tick sliding: |v| over 15 % of u
  stray: 0, // m lost per metre off the line at the end of the horizon (the horizon's effect: a plan that ends astray)
});

const LIMIT = 3;
const clampGene = (value) => Math.max(-LIMIT, Math.min(LIMIT, value));

/** The metres along a closed path at each point, and its length. */
function alongOf(path) {
  const n = path.x.length;
  const along = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) along[i + 1] = along[i] + Math.hypot(path.x[(i + 1) % n] - path.x[i], path.y[(i + 1) % n] - path.y[i]);
  return along;
}

/**
 * @param {{ track: Track, path: Path, car: Bicycle }} where
 * @param {{ settings?: PlannerSettings, rule?: import("./pursuit.js").Settings, seed?: number }} [options]
 */
export function createPlanner({ track, path, car }, { settings = PLANNER, rule = TUNED, seed = 1 } = {}) {
  const genes = 2 * settings.segments;
  return {
    track,
    path,
    car,
    settings,
    along: alongOf(path),
    driver: createPursuit(path, rule),
    shadow: createPursuit(path, rule),
    climber: createClimb({ genes }),
    rng: createRng(seed),
    plan: new Float64Array(genes),
    from: { state: /** @type {CarState} */ ({}), index: 0 },
    probe: /** @type {CarState} */ ({}),
    controls: { steer: 0, pedal: 0 },
    tick: 0,
    plans: 0,
    /** @type {any} the climb's problem, made at the first search */
    problem: null,
  };
}

/** @typedef {ReturnType<typeof createPlanner>} Planner */

/** The rule's controls for this tick, with the plan's offsets of a segment, into `planner.controls`. */
function corrected(planner, driver, state, [steer, pedal]) {
  const rule = pursue(driver, planner.car, state);
  planner.controls.steer = rule.steer + steer * planner.settings.steer;
  planner.controls.pedal = Math.max(-1, Math.min(1, rule.pedal + pedal * planner.settings.pedal));
  return planner.controls;
}

/**
 * A plan's worth: a rollout of the horizon from the search's start, on the shadow driver and the probe state.
 * @param {Planner} planner
 * @param {Float64Array} plan
 */
export function scorePlan(planner, plan) {
  const { car, path, track, settings, shadow, probe, from, along } = planner;
  Object.assign(probe, from.state);
  shadow.index = from.index;
  const ticks = Math.round(settings.segment / TICK);
  let fine = 0;
  for (let s = 0; s < settings.segments; s += 1) {
    /** @type {[number, number]} */
    const offsets = [plan[2 * s], plan[2 * s + 1]];
    for (let k = 0; k < ticks; k += 1) {
      stepCar(car, probe, corrected(planner, shadow, probe, offsets), TICK);
      if (pastEdge(track, shadow.index, probe) > 0) fine += settings.offFine;
      if (Math.abs(probe.v) > 0.15 * probe.u) fine += settings.slideFine;
    }
  }
  const end = nearestPoint(path, shadow.index, probe.x, probe.y);
  const length = along[along.length - 1];
  const gained = (((along[end] - along[from.index]) % length) + length) % length;
  const wanted = path.speed[end];
  const excess = probe.u > wanted ? (probe.u * probe.u - wanted * wanted) / (2 * settings.brake) : 0;
  const astray = Math.abs((probe.x - path.x[end]) * path.nx[end] + (probe.y - path.y[end]) * path.ny[end]);
  planner.plans += 1;
  return gained - excess - fine - settings.stray * astray;
}

/** The climb's problem: start from the rule, shift the last best a segment, move a segment's two genes. */
function problemOf(planner) {
  return {
    start: (plan) => plan.fill(0),
    score: (plan) => scorePlan(planner, plan),
    shift(next, last) {
      next.set(last.subarray(2));
      next[next.length - 2] = last[last.length - 2];
      next[next.length - 1] = last[last.length - 1];
    },
    mutate(child, best, amplitude, rng) {
      child.set(best);
      const at = 2 * rng.int(planner.settings.segments);
      child[at] = clampGene(child[at] + amplitude * rng.normal());
      child[at + 1] = clampGene(child[at + 1] + amplitude * rng.normal());
    },
    fresh: (plan) => plan.fill(0),
  };
}

/**
 * The controls for this tick: a search at the start of each segment, then the rule with the plan's first segment.
 * @param {Planner} planner
 * @param {CarState} state
 */
export function plannedControls(planner, state) {
  const ticks = Math.round(planner.settings.segment / TICK);
  if (planner.tick % ticks === 0) {
    Object.assign(planner.from.state, state);
    planner.from.index = nearestPoint(planner.path, planner.driver.index, state.x, state.y);
    const problem = (planner.problem ??= problemOf(planner));
    planner.plan.set(planner.climber.run(problem, { budget: planner.settings.budget, rng: planner.rng, freshEvery: Infinity }).plan);
  }
  planner.tick += 1;
  return corrected(planner, planner.driver, state, [planner.plan[0], planner.plan[1]]);
}
