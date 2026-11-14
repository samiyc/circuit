import { linePoints } from "../line/line.js";
import { createProfile, lapTime } from "../profile/profile.js";

/**
 * A line as the page shows it (J3): its points, its speed profile, and its clock, the time at which a car on a flying
 * lap passes each point, to move its ghost and to read the gap to another line point by point. Two lines of the same
 * track share their points' indices (an offset a track point), so the gap at point i is the difference of their clocks
 * there. Pure: offsets in, numbers out.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("../types.js").Car} Car
 * @typedef {import("../types.js").Profile} Profile
 * @typedef {{ x: Float64Array, y: Float64Array, profile: Profile, clock: Float64Array, time: number }} Lap
 */

/**
 * The time at each point of a closed line from its profile, each step at its mean speed as `lapTime` counts it: n + 1
 * entries, the first 0 and the last the lap time (the line back at its first point).
 * @param {Profile} profile
 * @returns {Float64Array}
 */
export function lapClock({ count, step, speed }) {
  const clock = new Float64Array(count + 1);
  for (let i = 0; i < count; i += 1) {
    const next = i + 1 < count ? i + 1 : 0;
    clock[i + 1] = clock[i] + (2 * step[i]) / (speed[i] + speed[next]);
  }
  return clock;
}

/**
 * A line's lap.
 * @param {Track} track
 * @param {Car} car
 * @param {Float64Array} offsets
 * @returns {Lap}
 */
export function createLap(track, car, offsets) {
  const { x, y } = linePoints(track, offsets);
  const profile = createProfile(track.count);
  const time = lapTime(car, { x, y }, profile);
  return { x, y, profile, clock: lapClock(profile), time };
}

/**
 * Where a car is at `t` seconds of its lap (taken modulo the lap): the step it is on and how far along, by time.
 * @param {Float64Array} clock
 * @param {number} t s
 * @returns {{ index: number, fraction: number }}
 */
export function placeAt(clock, t) {
  const lap = clock[clock.length - 1];
  const wanted = ((t % lap) + lap) % lap;
  let low = 0;
  let high = clock.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (clock[middle] <= wanted) low = middle;
    else high = middle;
  }
  const span = clock[high] - clock[low];
  return { index: low, fraction: span > 0 ? (wanted - clock[low]) / span : 0 };
}

/**
 * The position of a car on its lap at `t` seconds, between the two points of its step.
 * @param {Lap} lap
 * @param {number} t s
 * @returns {{ x: number, y: number, index: number, heading: number }}
 */
export function positionAt({ x, y, clock }, t) {
  const { index, fraction } = placeAt(clock, t);
  const next = index + 1 < x.length ? index + 1 : 0;
  const dx = x[next] - x[index];
  const dy = y[next] - y[index];
  return { x: x[index] + fraction * dx, y: y[index] + fraction * dy, index, heading: Math.atan2(dy, dx) };
}

/**
 * The time `other` loses on `lap` by each point (positive: `other` passes it later), n + 1 entries.
 * @param {Lap} lap
 * @param {Lap} other
 * @returns {Float64Array}
 */
export function timeGap(lap, other) {
  return Float64Array.from(lap.clock, (t, i) => other.clock[i] - t);
}

/**
 * The time A gains on B between two points along the lap, read on `timeGap(a, b)` (n + 1 entries), wrapping past
 * the start.
 * @param {Float64Array} gap
 * @param {number} from
 * @param {number} to
 * @returns {number} s
 */
export function gainBetween(gap, from, to) {
  if (to >= from) return gap[to] - gap[from];
  return gap[gap.length - 1] - gap[from] + gap[to] - gap[0];
}
