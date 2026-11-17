import { createTrack, parseTrack } from "../src/track/track.js";

/**
 * What the page reads: a TUM track from data/tum/ (`npm run tracks`), and its lines from data/lines/ (`npm run
 * lines`). Without the lines, a worker computes the references (about a second and a half), and the search on demand
 * (about 20 s); the same modules as the script, the same seed, so the same lines.
 * @typedef {import("../src/types.js").Track} Track
 * @typedef {Record<string, Float64Array>} Lines the offsets of each line, by key
 */

/** The lines the page knows, in the order of the menus, with their names. */
export const LINE_NAMES = Object.freeze({
  rain: "La ligne de pluie (P8)",
  best: "La recherche finie par la descente",
  search: "La recherche (40 → 20 → 10 m)",
  minCurvature: "La courbure minimale",
  centre: "La ligne centrale",
  shortest: "La plus courte",
});

/**
 * A track of the database.
 * @param {string} name
 * @returns {Promise<{ track: Track, text: string }>}
 */
export async function loadTrack(name) {
  const response = await fetch(`../data/tum/tracks/${name}.csv`);
  if (!response.ok) throw new Error(`data/tum/tracks/${name}.csv manque : lancer npm run tracks`);
  const text = await response.text();
  return { track: createTrack(parseTrack(text)), text };
}

/**
 * The lines computed by `npm run lines`, or null if they are not there; `folder` lines-bicycle for those searched for
 * the car that slips (`npm run lines -- --bicycle`, the drive page).
 * @param {string} name
 * @param {string} [folder]
 * @returns {Promise<Lines | null>}
 */
export async function loadLines(name, folder = "lines") {
  const response = await fetch(`../data/${folder}/${name}.json`).catch(() => null);
  if (!response?.ok) return null;
  const data = await response.json();
  return Object.fromEntries(Object.entries(data.lines).map(([key, values]) => [key, Float64Array.from(values)]));
}

/**
 * Asks the worker for lines: `references` (the three) or `best` (the search, from the minimum curvature).
 * @param {string} text the track's CSV
 * @param {"references" | "best"} task
 * @param {Float64Array} [base] the minimum-curvature line, for `best`
 * @returns {Promise<Lines>}
 */
export function computeLines(text, task, base) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("lines-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      worker.terminate();
      if (data.error) reject(new Error(data.error));
      else resolve(Object.fromEntries(Object.entries(data.lines).map(([key, values]) => [key, Float64Array.from(values)])));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage({ text, task, base: base ? [...base] : null });
  });
}
