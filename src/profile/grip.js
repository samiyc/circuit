import { gripShift, normalLoad, powerAt, resistance } from "../car.js";

/**
 * What the friction ellipse leaves at a point (docs/modele.md, § 2): the cornering speed where the lateral force alone
 * takes all the grip, then the acceleration and the braking the rest allows. (Fx / μx·N)² + (Fy / μy·N)² ≤ 1, with
 * N = m·g + ½·ρ·cz·A·v² and every μ shifted by dμ/dFz·(N/4 − Fz0).
 * @typedef {import("../types.js").Car} Car
 */

/**
 * The speed at which the lateral force m·v²·|κ| takes all the lateral grip μy(N)·N. With u = v², N = A + B·u and
 * μy = c0 + c1·u, it is the positive root of c1·B·u² + (c0·B + c1·A − m·|κ|)·u + c0·A = 0, taken in its stable form.
 * Capped at the top speed.
 * @param {Car} car
 * @param {number} curvature 1/m, either sign
 * @returns {number} m/s
 */
export function cornerSpeed(car, curvature) {
  const weight = car.mass * car.gravity;
  const c0 = car.muY + gripShift(car, weight);
  const c1 = (car.loadSensitivity * car.downforce) / 4;
  const a = c1 * car.downforce;
  const b = c0 * car.downforce + c1 * weight - car.mass * Math.abs(curvature);
  const c = c0 * weight;
  const root = Math.sqrt(b * b - 4 * a * c);
  // a ≤ 0; at a = 0 (no downforce or no load sensitivity) a positive b means no speed limit: (b + root) / 0 = ∞.
  const squared = b <= 0 ? (2 * c) / (root - b) : (b + root) / (2 * Math.abs(a));
  return Math.min(Math.sqrt(squared), car.topSpeed);
}

/**
 * The share of the longitudinal grip the corner leaves, √(1 − (Fy / μy·N)²).
 * @param {Car} car
 * @param {number} speed
 * @param {number} curvature
 * @param {number} load N
 * @returns {number}
 */
function remainingShare(car, speed, curvature, load) {
  const lateral = car.mass * speed * speed * Math.abs(curvature);
  const ratio = lateral / ((car.muY + gripShift(car, load)) * load);
  return ratio >= 1 ? 0 : Math.sqrt(1 - ratio * ratio);
}

/**
 * The greatest acceleration at this speed and curvature: the traction the corner leaves, capped by the power, less
 * the drag and the rolling.
 * @param {Car} car
 * @param {number} speed m/s
 * @param {number} curvature 1/m
 * @returns {number} m/s², negative above the top speed
 */
export function driveAcceleration(car, speed, curvature) {
  const load = normalLoad(car, speed);
  const traction = (car.driveMu + gripShift(car, load)) * load * remainingShare(car, speed, curvature, load);
  const drive = Math.min(traction, powerAt(car, speed) / speed);
  return (drive - resistance(car, speed)) / car.mass;
}

/**
 * The greatest deceleration at this speed and curvature: the braking grip the corner leaves, helped by the drag and
 * the rolling.
 * @param {Car} car
 * @param {number} speed m/s
 * @param {number} curvature 1/m
 * @returns {number} m/s², positive
 */
export function brakeDeceleration(car, speed, curvature) {
  const load = normalLoad(car, speed);
  const braking = (car.muX + gripShift(car, load)) * load * remainingShare(car, speed, curvature, load);
  return (braking + resistance(car, speed)) / car.mass;
}
