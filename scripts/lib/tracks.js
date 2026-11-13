import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createTrack, parseRaceline, parseTrack } from "../../src/track/track.js";

/**
 * The tracks of TU Munich's racetrack-database, as `npm run tracks` lays them in data/tum/ (git ignores it).
 * @typedef {import("../../src/types.js").Track} Track
 */

/** The commit of racetrack-database the measures read (master on 13/11/2026). */
export const TUM_COMMIT = "e59595d1f3573b30d1ded6a08984935b957688e0";

export const TUM_DIR = fileURLToPath(new URL("../../data/tum/", import.meta.url));

/** The 25 tracks of the database, by file name (the folder `tracks`, read on 13/11/2026). */
export const TRACK_NAMES = Object.freeze([
  "Austin",
  "BrandsHatch",
  "Budapest",
  "Catalunya",
  "Hockenheim",
  "IMS",
  "Melbourne",
  "MexicoCity",
  "Montreal",
  "Monza",
  "MoscowRaceway",
  "Norisring",
  "Nuerburgring",
  "Oschersleben",
  "Sakhir",
  "SaoPaulo",
  "Sepang",
  "Shanghai",
  "Silverstone",
  "Sochi",
  "Spa",
  "Spielberg",
  "Suzuka",
  "YasMarina",
  "Zandvoort",
]);

/** Whether `npm run tracks` has run. */
export const tracksDownloaded = () => existsSync(join(TUM_DIR, "tracks", "Monza.csv"));

/**
 * A track of the database.
 * @param {string} name
 * @returns {Track}
 */
export function readTrack(name) {
  const path = join(TUM_DIR, "tracks", `${name}.csv`);
  if (!existsSync(path)) throw new Error(`${path} manque : lancer \`npm run tracks\` d'abord`);
  return createTrack(parseTrack(readFileSync(path, "utf8")));
}

/**
 * TU Munich's minimum-curvature race line of a track.
 * @param {string} name
 * @returns {{ x: Float64Array, y: Float64Array }}
 */
export function readRaceline(name) {
  return parseRaceline(readFileSync(join(TUM_DIR, "racelines", `${name}.csv`), "utf8"));
}
