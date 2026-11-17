/**
 * Sami at the controls (J4, P9, docs/pilote.md § 6): the keys and the gamepad he chose on 13/11
 * (docs/recherche/questions.md), turned into the car's controls. Pure, for the tests to play them: the page reads the
 * keys held and the gamepad, this module gives the steering and the pedal.
 *
 * - **Keyboard**: Up accelerates, left Ctrl (or Down) brakes, the arrows steer. A key is all or nothing, so the
 *   steering moves towards the lock in KEY_STEER_TIME rather than at once.
 * - **Gamepad** (the standard mapping): A accelerates, RB brakes, the RT trigger brakes in proportion (trail braking),
 *   the left stick steers in proportion. The `triggers` layout (17/11, P9: an all-or-nothing A spun the car out of the
 *   corners) doses the throttle on RT and the brake on LT, as racing games do; A and RB still work.
 * - **At speed** the lock shrinks to what gives LATERAL_LIMIT m/s² (L·a / u²), as in a racing game: a full key at
 *   300 km/h would otherwise spin the car at once.
 * @typedef {import("./bicycle.js").Bicycle} Bicycle
 * @typedef {{ throttle: number, brake: number, steer: number, analog: boolean }} Input the driver's hands: the
 *   throttle and the brake in [0, 1], the steering in [−1, 1] (left positive), analog when it comes from a stick
 */

export const KEYS = Object.freeze({ throttle: ["ArrowUp"], brake: ["ControlLeft", "ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"] });
/** The standard gamepad's buttons and axis. */
export const PAD = Object.freeze({ throttle: 0, brake: 5, trigger: 7, leftTrigger: 6, stick: 0, deadZone: 0.08 });
/** The gamepad layouts: Sami's of 13/11, and the racing games' (throttle RT, brake LT). */
export const PAD_LAYOUTS = Object.freeze(["sami", "triggers"]);
/** s from straight to full lock on a key, a hypothesis. */
export const KEY_STEER_TIME = 0.25;
/** m/s², the lateral acceleration of a full lock at speed: about 5 g, an F1's at the top (a hypothesis). */
export const LATERAL_LIMIT = 50;

const held = (keys, codes) => codes.some((code) => keys.has(code));

/**
 * The hands from the keys held.
 * @param {Set<string>} keys `KeyboardEvent.code`s
 * @returns {Input}
 */
export function keyboardInput(keys) {
  const steer = Number(held(keys, KEYS.left)) - Number(held(keys, KEYS.right));
  return { throttle: Number(held(keys, KEYS.throttle)), brake: Number(held(keys, KEYS.brake)), steer, analog: false };
}

/**
 * The hands from a gamepad's buttons and axes, or null without a gamepad.
 * @param {{ buttons: ArrayLike<{ pressed: boolean, value: number }>, axes: ArrayLike<number> } | null} pad
 * @param {string} [layout] one of PAD_LAYOUTS, Sami's by default
 * @returns {Input | null}
 */
export function padInput(pad, layout = "sami") {
  if (!pad) return null;
  const button = (i) => pad.buttons[i] ?? { pressed: false, value: 0 };
  const stick = pad.axes[PAD.stick] ?? 0;
  const steer = Math.abs(stick) < PAD.deadZone ? 0 : -stick;
  const [throttleTrigger, brakeTrigger] = layout === "triggers" ? [PAD.trigger, PAD.leftTrigger] : [-1, PAD.trigger];
  const brake = Math.max(Number(button(PAD.brake).pressed), button(brakeTrigger).value);
  return { throttle: Math.max(Number(button(PAD.throttle).pressed), button(throttleTrigger).value), brake, steer, analog: true };
}

/**
 * The keyboard and the gamepad together: the larger pedal and the larger steering win.
 * @param {Input} keys
 * @param {Input | null} pad
 * @returns {Input}
 */
export function mergeInputs(keys, pad) {
  if (!pad) return keys;
  const steer = Math.abs(pad.steer) > Math.abs(keys.steer) ? pad.steer : keys.steer;
  const analog = pad.steer !== 0 && Math.abs(pad.steer) >= Math.abs(keys.steer);
  return { throttle: Math.max(keys.throttle, pad.throttle), brake: Math.max(keys.brake, pad.brake), steer, analog };
}

/**
 * The lock at a speed: the car's, or the one that gives LATERAL_LIMIT if smaller.
 * @param {Bicycle} car
 * @param {number} speed m/s
 * @returns {number} rad
 */
export function lockAt(car, speed) {
  return Math.min(car.steerMax, (car.wheelbase * LATERAL_LIMIT) / Math.max(1, speed * speed));
}

/**
 * The controls for a tick: the steering share moves towards the hands (at once from a stick, in KEY_STEER_TIME from a
 * key), times the lock at this speed; the brake wins over the throttle.
 * @param {Input} input
 * @param {number} share the steering share of the last tick, in [−1, 1]
 * @param {{ car: Bicycle, speed: number, dt: number }} context
 * @returns {{ steer: number, pedal: number, share: number }}
 */
export function controlsOf(input, share, { car, speed, dt }) {
  const step = dt / KEY_STEER_TIME;
  const next = input.analog ? input.steer : share + Math.max(-step, Math.min(step, input.steer - share));
  const pedal = input.brake > 0 ? -input.brake : input.throttle;
  return { steer: next * lockAt(car, speed), pedal, share: next };
}
