import { linePoints } from "../src/line/line.js";
import { BAND, WET, onSurface } from "../src/profile/surface.js";
import { loadLines } from "./load.js";

/**
 * The weather of the lines page (P8, docs/pluie.md): dry; wet, the grip at WET everywhere; or wet with the dry line's
 * band more slippery (BAND, a hypothesis). On a wet road the page drives every line with the wet car, and adds the line
 * searched for that weather (`node scripts/p8.js <weather>`, data/lines-wet/), if it is there.
 * @typedef {import("../src/types.js").Track} Track
 * @typedef {import("../src/types.js").Car} Car
 */

/** The share of grip lost on the dry line's band, by weather; null for the dry road. */
export const WEATHERS = Object.freeze({ dry: null, wet: 0, band: BAND.drop });

/**
 * The line searched for this weather, as `{ rain }`, or nothing.
 * @param {string} name the track
 * @param {string} weather
 * @param {string} [root] data/lines-wet/ for the point mass, data/lines-wet-bicycle/ for the car that slips
 * @returns {Promise<Record<string, Float64Array>>}
 */
export async function rainLines(name, weather, root = "lines-wet") {
  if (WEATHERS[weather] === null || WEATHERS[weather] === undefined) return {};
  const lines = await loadLines(name, `${root}/${weather}`);
  return lines?.best ? { rain: lines.best } : {};
}

/**
 * The car on this weather's road, the point mass or the car that slips; its band around the dry line `dry` (the best).
 * @template {Record<string, any>} C
 * @param {C} car
 * @param {Track} track
 * @param {string} weather
 * @param {Float64Array | undefined} dry
 * @returns {C}
 */
export function carIn(car, track, weather, dry) {
  const drop = WEATHERS[weather] ?? null;
  if (drop === null) return car;
  return onSurface(car, { wet: WET, ...(drop > 0 && dry && { line: linePoints(track, dry), half: BAND.half, drop }) });
}
