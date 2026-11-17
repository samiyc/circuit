/**
 * The braking boards of the drive page (P9; docs/recherche/questions.md § 4, question 1: drivers find their braking
 * point from the boards at 150, 100 and 50 m). A braking point is where the line's profile stops accelerating and
 * starts a drop of at least MIN_DROP; each board stands that far before it, along the line, on the side of the track
 * the line is not on. Pure: the page draws them.
 * @typedef {import("./lap.js").Lap} Lap
 * @typedef {import("../types.js").Track} Track
 * @typedef {{ index: number, distance: number, side: 1 | -1 }} Board side 1 the left edge, −1 the right
 */

/** m before the braking point. */
export const BOARD_DISTANCES = Object.freeze([150, 100, 50]);
/** m/s, the smallest drop of speed that makes a braking point (a lift is not one). */
export const MIN_DROP = 8;

/**
 * The points where the profile starts braking: a local top followed by a drop of MIN_DROP or more to the next low.
 * @param {Float64Array} speed the profile's, one per point of a closed line
 * @returns {number[]}
 */
export function brakingPoints(speed) {
  const n = speed.length;
  const at = (i) => speed[((i % n) + n) % n];
  const points = [];
  for (let i = 0; i < n; i += 1) {
    if (!(at(i) >= at(i - 1) && at(i + 1) < at(i))) continue;
    let low = i + 1;
    while (low < i + n && at(low + 1) <= at(low)) low += 1;
    if (at(i) - at(low) >= MIN_DROP) points.push(i);
  }
  return points;
}

/**
 * The point `distance` metres before point `from`, walking back along the steps.
 * @param {Float64Array} step m, from each point to the next
 * @param {number} from
 * @param {number} distance m
 */
function before(step, from, distance) {
  const n = step.length;
  let index = from;
  for (let walked = 0; walked < distance; ) {
    index = (index - 1 + n) % n;
    walked += step[index];
  }
  return index;
}

/**
 * Every board of a lap.
 * @param {Track} track
 * @param {Lap} lap
 * @returns {Board[]}
 */
export function brakingBoards(track, lap) {
  return brakingPoints(lap.profile.speed).flatMap((point) =>
    BOARD_DISTANCES.map((distance) => {
      const index = before(lap.profile.step, point, distance);
      const offset = (lap.x[index] - track.x[index]) * track.nx[index] + (lap.y[index] - track.y[index]) * track.ny[index];
      return { index, distance, side: offset > 0 ? -1 : 1 };
    }),
  );
}
