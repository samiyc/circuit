import { stepCar } from "./bicycle.js";
import { FEED_FIELDS } from "./feed.js";
import { controlsOf } from "./input.js";
import { TUNED, createPursuit, nearestPoint, pursue } from "./pursuit.js";
import { TICK, advance, pastEdge, roadGrip, startOf } from "./run.js";

/**
 * A drive on the page (J4, P9): Sami's car and the driver's car, both from the line's start at its profile's speed,
 * stepped together tick by tick. Each counts its laps by its own clock: the time from one crossing of the start to the
 * next, and the time off the track in it. Sami's car never stops: it spins, it leaves the track, he brings it back.
 * His car has the assists (traction control and ABS, src/drive/bicycle.js) unless he turns them off: a key is all or
 * nothing, and a full key out of a corner spun the car (17/11); the driver's car never has them. The driver is the
 * tuned rule, stepped here, or the driver by search, whose states a worker hands in ahead (src/drive/feed.js): fed,
 * it waits when the feed runs dry, its clock stopped.
 * Pure: the page gives the hands each tick and draws the session.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("./pursuit.js").Path} Path
 * @typedef {import("./bicycle.js").Bicycle} Bicycle
 * @typedef {import("./bicycle.js").CarState} CarState
 * @typedef {import("./input.js").Input} Input
 * @typedef {{ time: number, off: number }} LapRecord
 * @typedef {{ state: CarState, index: number, passed: number, clock: number, lapStart: number, lapOff: number, off: boolean, laps: LapRecord[] }} Racer
 */

/** @param {Path} path @returns {Racer} */
function racerOn(path) {
  return { state: startOf(path), index: 0, passed: 0, clock: 0, lapStart: 0, lapOff: 0, off: false, laps: [] };
}

/**
 * @param {{ track: Track, path: Path, car: Bicycle, settings?: import("./pursuit.js").Settings, assists?: boolean, fed?: boolean }} setup
 *   the rule's settings, P7's by default; Sami's assists, on by default; fed: the driver's states come from feedSession
 */
export function createSession({ track, path, car, settings = TUNED, assists = true, fed = false }) {
  const robot = { ...racerOn(path), driver: fed ? null : createPursuit(path, settings), feed: /** @type {Float64Array[]} */ ([]), fedAt: 0 };
  return { track, path, car, playerCar: { ...car, assists }, time: 0, share: 0, player: racerOn(path), robot };
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
  racer.clock += TICK;
  racer.off = pastEdge(session.track, next, racer.state) > 0;
  if (racer.off) racer.lapOff += TICK;
  if (racer.passed < n) return;
  racer.laps.push({ time: racer.clock - racer.lapStart, off: racer.lapOff });
  racer.passed -= n;
  racer.lapStart = racer.clock;
  racer.lapOff = 0;
}

/**
 * States of the fed driver's car, packed as src/drive/feed.js packs them, to drive it on.
 * @param {Session} session
 * @param {Float64Array} chunk
 */
export function feedSession({ robot }, chunk) {
  robot.feed.push(chunk);
}

/** The ticks of the fed driver's car not driven yet. @param {Session} session */
export function fedTicks({ robot }) {
  return robot.feed.reduce((sum, chunk) => sum + chunk.length / FEED_FIELDS, 0) - robot.fedAt;
}

/** The driver's tick: the rule's step, or the feed's next state; false when the feed is dry. @param {Session} session */
function driveRobot(session) {
  const { car, robot } = session;
  if (robot.driver) {
    robot.driver.index = robot.index;
    roadGrip(car, session.track, robot.state, robot.index);
    stepCar(car, robot.state, pursue(robot.driver, car, robot.state), TICK);
    return true;
  }
  const chunk = robot.feed[0];
  if (!chunk) return false;
  const at = robot.fedAt * FEED_FIELDS;
  [robot.state.x, robot.state.y, robot.state.heading, robot.state.u] = chunk.subarray(at, at + FEED_FIELDS);
  robot.fedAt += 1;
  if (at + FEED_FIELDS >= chunk.length) {
    robot.feed.shift();
    robot.fedAt = 0;
  }
  return true;
}

/**
 * One tick: Sami's hands drive his car, the driver drives the other.
 * @param {Session} session
 * @param {Input} input
 */
export function tickSession(session, input) {
  const { car, playerCar, player, robot } = session;
  const controls = controlsOf(input, session.share, { car, speed: player.state.u, dt: TICK });
  session.share = controls.share;
  roadGrip(playerCar, session.track, player.state, player.index);
  stepCar(playerCar, player.state, controls, TICK);
  session.time += TICK;
  place(session, player);
  if (driveRobot(session)) place(session, robot);
}

/**
 * The time Sami's car is in its lap, and its gap to a reference lap at the same point (positive: behind it).
 * @param {Session} session
 * @param {Float64Array} clock the reference's time at each point (src/view/lap.js)
 */
export function lapGap({ player }, clock) {
  const elapsed = player.clock - player.lapStart;
  return { elapsed, gap: elapsed - clock[player.index] };
}
