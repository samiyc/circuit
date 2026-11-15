import { gripShift, normalLoad, powerAt, resistance } from "../car.js";

/**
 * The pure-pursuit driver (J4, docs/pilote.md § 3), the rule to beat: it aims at the point of the line a look-ahead
 * distance in front, steers on the arc that reaches it, plus Stanley's term towards the line (Hoffmann et al. 2007,
 * the Stanford car of the DARPA Grand Challenge), and follows the profile a little ahead, its speed scaled by a
 * margin: the pedal gives the profile's acceleration (the throttle a driver doses on the way out of a corner, for the
 * rear wheels to keep some grip to turn), plus a share of the speed's shortfall. Its settings are the genes a search
 * tunes.
 * @typedef {{ x: Float64Array, y: Float64Array, nx: Float64Array, ny: Float64Array, speed: Float64Array, accel: Float64Array }} Path
 *   a closed line, the track's normals, the line's speed profile and the acceleration from each point to the next, m/s²
 * @typedef {import("./bicycle.js").Bicycle} Bicycle
 * @typedef {import("./bicycle.js").CarState} CarState
 * @typedef {import("./bicycle.js").Controls} Controls
 */

/** Hypotheses, set by hand on Monza (docs/pilote.md § 3), for a search to tune. */
export const PURSUIT = Object.freeze({
  lookTime: 0.25, // s of the current speed, the look-ahead distance
  lookMin: 8, // m, the look-ahead at low speed
  margin: 1, // the share of the profile's speed asked for
  gain: 0.1, // pedal per m/s short of the wanted speed
  anticipation: 0.3, // s ahead of the car where the wanted speed is read
  crossGain: 1, // 1/s, Stanley's term: steer atan(k·e/u) towards the line, e the distance across it
});

/**
 * A line's path from its lap (src/view/lap.js): its points, its speeds and the accelerations between them.
 * @param {{ x: Float64Array, y: Float64Array, profile: import("../types.js").Profile }} lap
 * @param {{ nx: Float64Array, ny: Float64Array }} track its normals, along which the line's offsets go
 * @returns {Path}
 */
export function pathOf({ x, y, profile: { speed, step, count } }, { nx, ny }) {
  const accel = Float64Array.from(speed, (v, i) => (speed[(i + 1) % count] ** 2 - v * v) / (2 * step[i]));
  return { x, y, nx, ny, speed, accel };
}

/**
 * The pedal that gives an acceleration at a speed, on the point mass's figures: the throttle's force is the rear's
 * traction or the power, the brake's the grip of all four wheels.
 * @param {Bicycle} car
 * @param {number} speed m/s
 * @param {number} accel m/s²
 */
export function pedalFor({ point }, speed, accel) {
  const load = normalLoad(point, speed);
  const force = point.mass * accel + resistance(point, speed);
  if (force >= 0) return force / Math.min(powerAt(point, speed) / speed, (point.driveMu + gripShift(point, load)) * load);
  return force / ((point.muX + gripShift(point, load)) * load);
}

/**
 * The share of the longitudinal grip the corner leaves, from the lateral acceleration the driver feels (u·r) on the
 * point mass's figures: √(1 − (a_y / a_y,max)²), what bounds the pedal either way.
 * @param {Bicycle} car
 * @param {import("./bicycle.js").CarState} state
 */
export function gripLeft({ point }, { u, r }) {
  const load = normalLoad(point, u);
  const used = (point.mass * Math.abs(u * r)) / ((point.muY + gripShift(point, load)) * load);
  return used >= 1 ? 0 : Math.sqrt(1 - used * used);
}

/**
 * @param {Path} path
 * @param {typeof PURSUIT} [settings]
 */
export function createPursuit(path, settings = PURSUIT) {
  return { path, settings, index: 0, controls: { steer: 0, pedal: 0 } };
}

const squared = (path, i, x, y) => (path.x[i] - x) ** 2 + (path.y[i] - y) ** 2;

/**
 * The point of a closed line nearest to (x, y), walking from the last one while the distance shrinks: the car moves
 * a few points a tick at most.
 * @param {Path} path
 * @param {number} index the last nearest point
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
export function nearestPoint(path, index, x, y) {
  const n = path.x.length;
  let best = index;
  for (const direction of [1, n - 1]) {
    let next = (best + direction) % n;
    while (squared(path, next, x, y) < squared(path, best, x, y)) {
      best = next;
      next = (best + direction) % n;
    }
  }
  return best;
}

/**
 * The first point from `index` at least `distance` metres from (x, y), along the line.
 * @param {Path} path
 * @param {number} index
 * @param {{ x: number, y: number }} from
 * @param {number} distance m
 */
function pointAhead(path, index, { x, y }, distance) {
  const n = path.x.length;
  let i = index;
  for (let k = 0; k < n && squared(path, i, x, y) < distance * distance; k += 1) i = (i + 1) % n;
  return i;
}

/**
 * The controls for this tick, into `driver.controls`.
 * @param {ReturnType<typeof createPursuit>} driver
 * @param {Bicycle} car
 * @param {CarState} state
 * @returns {Controls}
 */
export function pursue(driver, car, state) {
  const { path, settings, controls } = driver;
  driver.index = nearestPoint(path, driver.index, state.x, state.y);
  const target = pointAhead(path, driver.index, state, Math.max(settings.lookMin, settings.lookTime * state.u));
  const dx = path.x[target] - state.x;
  const dy = path.y[target] - state.y;
  const side = -Math.sin(state.heading) * dx + Math.cos(state.heading) * dy;
  const i = driver.index;
  const across = (state.x - path.x[i]) * path.nx[i] + (state.y - path.y[i]) * path.ny[i];
  controls.steer = Math.atan((2 * car.wheelbase * side) / Math.max(1, dx * dx + dy * dy)) - Math.atan((settings.crossGain * across) / state.u);
  const read = pointAhead(path, driver.index, state, settings.anticipation * state.u);
  const shortfall = settings.margin * path.speed[read] - state.u;
  const feed = pedalFor(car, state.u, settings.margin * settings.margin * path.accel[read]);
  const left = gripLeft(car, state);
  controls.pedal = Math.min(left, Math.max(-left, feed + settings.gain * shortfall));
  return controls;
}
