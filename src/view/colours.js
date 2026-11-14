/**
 * The colour of a speed on the page (J3): from red for the slowest point of the lap, through orange and green, to
 * blue for the fastest, chosen to read on the Khaki background. Pure: numbers in, a CSS colour out.
 */

/** The stops of the ramp, from slow to fast, as [r, g, b]. */
export const SPEED_RAMP = Object.freeze([
  [178, 24, 43],
  [230, 97, 1],
  [77, 146, 33],
  [33, 102, 172],
]);

/**
 * The colour of `value` between `low` (the first stop) and `high` (the last), clamped; the last stop when the lap
 * has one speed (an oval taken flat out).
 * @param {number} value
 * @param {number} low
 * @param {number} high
 * @returns {[number, number, number]}
 */
export function rampColour(value, low, high) {
  const share = high > low ? Math.min(1, Math.max(0, (value - low) / (high - low))) : 1;
  const position = share * (SPEED_RAMP.length - 1);
  const stop = Math.min(SPEED_RAMP.length - 2, Math.floor(position));
  const fraction = position - stop;
  const [a, b] = [SPEED_RAMP[stop], SPEED_RAMP[stop + 1]];
  const mix = (k) => Math.round(a[k] + fraction * (b[k] - a[k]));
  return [mix(0), mix(1), mix(2)];
}

/**
 * The same as a CSS colour.
 * @param {number} value
 * @param {number} low
 * @param {number} high
 * @returns {string}
 */
export function speedColour(value, low, high) {
  const [r, g, b] = rampColour(value, low, high);
  return `rgb(${r} ${g} ${b})`;
}
