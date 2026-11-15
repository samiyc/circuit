import { stepCar } from "./bicycle.js";
import { controlsOf } from "./input.js";
import { TUNED, createPursuit, nearestPoint, pursue } from "./pursuit.js";
import { TICK, advance, pastEdge, startOf } from "./run.js";

/**
 * A drive on the page (J4, P9): Sami's car and the pure-pursuit driver's car, both from the line's start at its
 * profile's speed, stepped together tick by tick. Each counts its laps: the time from one crossing of the start to the
 * next, and the time off the track in it. Sami's car never stops: it spins, it leaves the track, he brings it back.
 * Pure: the page gives the hands each tick and draws the session.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("./pursuit.js").Path} Path
 * @typedef {import("./bicycle.js").Bicycle} Bicycle
 * @typedef {import("./bicycle.js").CarState} CarState
 * @typedef {import("./input.js").Input} Input
 * @typedef {{ time: number, off: number }} LapRecord
 * @typedef {{ state: CarState, index: number, passed: number, lapStart: number, lapOff: number, off: boolean, laps: LapRecord[] }} Racer
 */

/** @param {Path} path @returns {Racer} */
function racerOn(path) {
  return { state: startOf(path), index: 0, passed: 0, lapStart: 0, lapOff: 0, off: false, laps: [] };
}

/**
 * @param {{ track: Track, path: Path, car: Bicycle, settings?: import("./pursuit.js").Settings }} setup the driver's settings, P7's by default
 */
export function createSession({ track, path, car, settings = TUNED }) {
  return { track, path, car, time: 0, share: 0, player: racerOn(path), robot: { ...racerOn(path), driver: createPursuit(path, settings) } };
}

/** @typedef {ReturnType<typeof createSession>} Session */

/**
 * A racer's place after its step: its nearest point, its progress, the tick off the track, a lap closed at the start.
 * @param {Session} session
 * @param {Racer} racer
 */
function place(session, racer) {
  const n = session.track.count;
  const next = nearestPoint(session.path, racer.index, racer.state.x, racer.state.y);
  racer.passed += advance(racer.index, next, n);
  racer.index = next;
  racer.off = pastEdge(session.track, next, racer.state) > 0;
  if (racer.off) racer.lapOff += TICK;
  if (racer.passed < n) return;
  racer.laps.push({ time: session.time - racer.lapStart, off: racer.lapOff });
  racer.passed -= n;
  racer.lapStart = session.time;
  racer.lapOff = 0;
}

/**
 * One tick: Sami's hands drive his car, the pure-pursuit driver drives the other.
 * @param {Session} session
 * @param {Input} input
 */
export function tickSession(session, input) {
  const { car, player, robot } = session;
  const controls = controlsOf(input, session.share, { car, speed: player.state.u, dt: TICK });
  session.share = controls.share;
  stepCar(car, player.state, controls, TICK);
  robot.driver.index = robot.index;
  stepCar(car, robot.state, pursue(robot.driver, car, robot.state), TICK);
  session.time += TICK;
  place(session, player);
  place(session, robot);
}

/**
 * The time Sami's car is in its lap, and its gap to a reference lap at the same point (positive: behind it).
 * @param {Session} session
 * @param {Float64Array} clock the reference's time at each point (src/view/lap.js)
 */
export function lapGap({ time, player }, clock) {
  const elapsed = time - player.lapStart;
  return { elapsed, gap: elapsed - clock[player.index] };
}
