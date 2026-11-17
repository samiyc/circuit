import { gripAt } from "../profile/surface.js";
import { createLap } from "../view/lap.js";
import { createBicycle, createCarState, profileCar, stepCar } from "./bicycle.js";
import { PURSUIT, createPursuit, nearestPoint, pathOf, pursue } from "./pursuit.js";

/**
 * A flying lap of the car that slips (J4, docs/pilote.md § 4): the car starts on the line's first point at the
 * profile's speed, a driver gives the controls each tick, and the lap ends when the car crosses the start again. It
 * counts the time, the time with the car's centre past an edge of the track (two wheels out), and the greatest
 * distance to the line, across it. A car that spins or leaves the track by more than OUT_LIMIT ends the lap unfinished.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("./pursuit.js").Path} Path
 * @typedef {import("./bicycle.js").Bicycle} Bicycle
 * @typedef {import("./bicycle.js").CarState} CarState
 * @typedef {import("./bicycle.js").Controls} Controls
 * @typedef {{ index: number }} Driver
 * @typedef {{ finished: boolean, time: number, offTime: number, deviation: number }} DrivenLap
 */

/** m past an edge that ends a lap: the car is in the gravel. */
export const OUT_LIMIT = 10;
/** s, the tick of the drivers, 100 Hz (as TMInterface's inputs, docs/recherche/trackmania.md). */
export const TICK = 0.01;

/**
 * The car on the line's first point, heading to the second, at the line's speed there.
 * @param {Path} path
 * @param {number} [share] of the profile's speed
 * @returns {CarState}
 */
export function startOf(path, share = 1) {
  const heading = Math.atan2(path.y[1] - path.y[0], path.x[1] - path.x[0]);
  return createCarState({ x: path.x[0], y: path.y[0], heading, speed: share * path.speed[0] });
}

/**
 * The road's grip under the car, into its state, from the car's surface (the rain, P8); before each step.
 * @param {{ surface?: import("../types.js").Surface }} car
 * @param {Track} track
 * @param {CarState} state
 * @param {number} index the car's nearest point
 */
export function roadGrip(car, track, state, index) {
  state.grip = gripAt(car.surface, track, index, state);
}

/**
 * How far the car is past an edge of the track at its nearest point, m (≤ 0 on the track).
 * @param {Track} track
 * @param {number} i
 * @param {CarState} state
 */
export function pastEdge(track, i, { x, y }) {
  const offset = (x - track.x[i]) * track.nx[i] + (y - track.y[i]) * track.ny[i];
  return Math.max(offset - track.wLeft[i], -offset - track.wRight[i]);
}

/**
 * How far the car is to the left of the line at its nearest point, along the track's normal there (the line's points
 * are offsets along it), m.
 * @param {Track} track
 * @param {Path} path
 * @param {number} i
 * @param {CarState} state
 */
export function sideOf(track, path, i, { x, y }) {
  return (x - path.x[i]) * track.nx[i] + (y - path.y[i]) * track.ny[i];
}

/**
 * The points advanced from `from` to `to` on a closed line of n points, signed, the shorter way.
 * @param {number} from
 * @param {number} to
 * @param {number} n
 */
export function advance(from, to, n) {
  const delta = to - from;
  if (delta > n / 2) return delta - n;
  return delta < -n / 2 ? delta + n : delta;
}

/**
 * Counts a tick off the track and the distance to the line; false when the car has spun or is in the gravel.
 * @param {DrivenLap} lap
 * @param {{ track: Track, path: Path }} where
 * @param {number} index the nearest point
 * @param {CarState} state
 */
function record(lap, { track, path }, index, state) {
  const out = pastEdge(track, index, state);
  if (out > 0) lap.offTime += TICK;
  lap.deviation = Math.max(lap.deviation, Math.abs(sideOf(track, path, index, state)));
  return out <= OUT_LIMIT && Math.abs(state.v) <= state.u;
}

/**
 * A lap, driven.
 * @param {{ track: Track, path: Path, car: Bicycle, drive: (state: CarState) => Controls, driver: Driver }} setup
 * @param {{ state?: CarState, limit?: number }} [options] the start (by default `startOf(path)`), the longest lap, s
 * @returns {DrivenLap}
 */
export function driveLap({ track, path, car, drive, driver }, { state = startOf(path), limit = 400 } = {}) {
  const n = track.count;
  const lap = { finished: false, time: 0, offTime: 0, deviation: 0 };
  let [index, passed] = [0, 0];
  while (lap.time < limit) {
    roadGrip(car, track, state, index);
    stepCar(car, state, drive(state), TICK);
    lap.time += TICK;
    const next = nearestPoint(path, index, state.x, state.y);
    passed += advance(index, next, n);
    index = next;
    driver.index = next;
    if (!record(lap, { track, path }, index, state)) return lap;
    if (passed >= n) return { ...lap, finished: true };
  }
  return lap;
}

/**
 * A line driven by the pure-pursuit driver, against the profile of the car that slips (`profileCar`): the profile's
 * time, and the lap.
 * @param {Track} track
 * @param {Float64Array} offsets
 * @param {{ car?: Bicycle, settings?: import("./pursuit.js").Settings }} [options]
 * @returns {DrivenLap & { profile: number }}
 */
export function driveLine(track, offsets, { car = createBicycle(), settings = PURSUIT } = {}) {
  const lap = createLap(track, profileCar(car), offsets);
  const path = pathOf(lap, track);
  const driver = createPursuit(path, settings);
  const driven = driveLap({ track, path, car, driver, drive: (state) => pursue(driver, car, state) }, { state: startOf(path, settings.margin) });
  return { profile: lap.time, ...driven };
}
