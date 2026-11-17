import { measureLine } from "../geometry.js";
import { brakeDeceleration, cornerSpeed, driveAcceleration } from "./grip.js";
import { fillGrip } from "./surface.js";

/**
 * The speed profile of a line and its lap time, the score of every line search (docs/modele.md, § 3): the cornering
 * speed at each point, a forward pass that accelerates under what the ellipse leaves, a backward pass that brakes the
 * same way, then the time of each step at its mean speed (exact under a constant acceleration). A closed line is a
 * flying lap, both passes starting from its slowest corner. The road's grip at each point comes from the car's
 * surface (P8, the rain), 1 everywhere without one. The buffers come from `createProfile`: scoring a line allocates
 * nothing.
 * @typedef {import("../types.js").Car} Car
 * @typedef {import("../types.js").Profile} Profile
 * @typedef {import("../types.js").Points} Points
 */

/**
 * The buffers for lines of `count` points.
 * @param {number} count
 * @returns {Profile}
 */
export function createProfile(count) {
  const buffer = () => new Float64Array(count);
  return { count, step: buffer(), curvature: buffer(), limit: buffer(), speed: buffer(), grip: buffer().fill(1) };
}

/**
 * The flying-lap time of a closed line; the profile is left in `profile.speed`.
 * @param {Car} car
 * @param {Points} line
 * @param {Profile} profile
 * @returns {number} s
 */
export function lapTime(car, line, profile) {
  measureLine(line.x, line.y, true, profile);
  fillGrip(car.surface, line, profile.grip);
  const start = setLimits(car, profile);
  const steps = profile.count - 1;
  forwardPass(car, profile, start, steps);
  backwardPass(car, profile, start, steps);
  return travelTime(profile, profile.count);
}

/**
 * The time along an open line entered at `entrySpeed` (or the first point's cornering speed, if lower), with a free
 * exit; the profile is left in `profile.speed`.
 * @param {Car} car
 * @param {Points} line
 * @param {Profile} profile
 * @param {number} entrySpeed m/s
 * @returns {number} s
 */
export function pathTime(car, line, profile, entrySpeed) {
  measureLine(line.x, line.y, false, profile);
  fillGrip(car.surface, line, profile.grip);
  setLimits(car, profile);
  profile.speed[0] = Math.min(entrySpeed, profile.limit[0]);
  const steps = profile.count - 1;
  forwardPass(car, profile, 0, steps);
  backwardPass(car, profile, steps, steps);
  return travelTime(profile, steps);
}

/**
 * The cornering speed at each point, and the speed profile set to it at the slowest one.
 * @param {Car} car
 * @param {Profile} profile
 * @returns {number} the index of the slowest corner
 */
function setLimits(car, { count, curvature, limit, speed, grip }) {
  let slowest = 0;
  for (let i = 0; i < count; i += 1) {
    limit[i] = cornerSpeed(car, curvature[i], grip[i]);
    if (limit[i] < limit[slowest]) slowest = i;
  }
  speed[slowest] = limit[slowest];
  return slowest;
}

/**
 * Accelerates `steps` steps from `start`, which holds its speed: v² grows by 2·a·ds, a taken at the step's start.
 * @param {Car} car
 * @param {Profile} profile
 * @param {number} start
 * @param {number} steps
 */
function forwardPass(car, { count, step, curvature, limit, speed, grip }, start, steps) {
  let i = start;
  for (let k = 0; k < steps; k += 1) {
    const next = i + 1 < count ? i + 1 : 0;
    const squared = speed[i] * speed[i] + 2 * driveAcceleration(car, speed[i], curvature[i], grip[i]) * step[i];
    speed[next] = Math.min(limit[next], Math.sqrt(Math.max(squared, 0)));
    i = next;
  }
}

/**
 * Brakes backwards `steps` steps from `start`: the speed before a point is at most what the braking there allows.
 * @param {Car} car
 * @param {Profile} profile
 * @param {number} start
 * @param {number} steps
 */
function backwardPass(car, { count, step, curvature, speed, grip }, start, steps) {
  let i = start;
  for (let k = 0; k < steps; k += 1) {
    const previous = i > 0 ? i - 1 : count - 1;
    const squared = speed[i] * speed[i] + 2 * brakeDeceleration(car, speed[i], curvature[i], grip[i]) * step[previous];
    speed[previous] = Math.min(speed[previous], Math.sqrt(squared));
    i = previous;
  }
}

/**
 * The time of the first `steps` steps, each at the mean of its two speeds.
 * @param {Profile} profile
 * @param {number} steps
 * @returns {number} s
 */
function travelTime({ count, step, speed }, steps) {
  let time = 0;
  for (let i = 0; i < steps; i += 1) {
    const next = i + 1 < count ? i + 1 : 0;
    time += (2 * step[i]) / (speed[i] + speed[next]);
  }
  return time;
}
