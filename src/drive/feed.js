import { stepCar } from "./bicycle.js";
import { createPlanner, plannedControls } from "./planner.js";
import { nearestPoint } from "./pursuit.js";
import { TICK, startOf } from "./run.js";

/**
 * The driver by search on the drive page (P7, docs/pilote.md § 9): its search takes about 50 ms every 0.25 s, too long
 * for the page's thread, so a worker drives its car ahead of the page and hands it the car's states, tick by tick. The
 * car meets no one (the other cars are ghosts), so its drive does not depend on Sami's: the worker can drive ahead.
 * Pure: the worker (web/planner-worker.js) only carries the messages. Seeded: a drive replays from its seed.
 * @typedef {import("../types.js").Track} Track
 * @typedef {import("./pursuit.js").Path} Path
 * @typedef {import("./bicycle.js").Bicycle} Bicycle
 */

/** The numbers of a state in a chunk: x, y, heading, u. */
export const FEED_FIELDS = 4;

/**
 * The driver by search's car on the line's first point, at the profile's speed, as the page's cars.
 * @param {{ track: Track, path: Path, car: Bicycle }} where
 * @param {{ seed?: number, settings?: import("./planner.js").PlannerSettings }} [options]
 */
export function createFeed(where, { seed = 1, settings } = {}) {
  return { where, planner: createPlanner(where, { seed, ...(settings && { settings }) }), state: startOf(where.path), index: 0 };
}

/** @typedef {ReturnType<typeof createFeed>} Feed */

/**
 * The next `ticks` states of the driver by search's car, packed FEED_FIELDS a tick.
 * @param {Feed} feed
 * @param {number} ticks
 */
export function feedTicks(feed, ticks) {
  const { where, planner, state } = feed;
  const chunk = new Float64Array(ticks * FEED_FIELDS);
  for (let k = 0; k < ticks; k += 1) {
    stepCar(where.car, state, plannedControls(planner, state), TICK);
    feed.index = nearestPoint(where.path, feed.index, state.x, state.y);
    planner.driver.index = feed.index;
    chunk.set([state.x, state.y, state.heading, state.u], k * FEED_FIELDS);
  }
  return chunk;
}
