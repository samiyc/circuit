import { readFileSync } from "node:fs";
import { driveLine } from "../src/drive/run.js";
import { TRACK_NAMES, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * `npm run drive [-- Piste…]`: the car that slips (J4) driven by the pure-pursuit driver on the lines of
 * `npm run lines` (data/lines/), the best one and the minimum-curvature one, against the profile of that car. A lap
 * is about 15 ms: the 25 tracks take a second, beside the queue.
 */
if (!tracksDownloaded()) {
  console.log("Les pistes manquent : npm run tracks");
  process.exit(1);
}
const names = process.argv.slice(2).length ? process.argv.slice(2) : TRACK_NAMES;
const LINES = { best: "la meilleure", minCurvature: "courbure min." };
const gaps = { best: [], minCurvature: [] };
const format = (value, digits = 2) => value.toFixed(digits).replace(".", ",");

/** One table row, and the gap kept for the means. */
function row(name, track, data, [key, label]) {
  const lap = driveLine(track, Float64Array.from(data.lines[key]));
  const gap = lap.time / lap.profile - 1;
  if (lap.finished) gaps[key].push(gap);
  const driven = lap.finished ? format(lap.time) : `arrêt à ${format(lap.time, 1)}`;
  const shown = lap.finished ? `${format(100 * gap, 1)} %` : "–";
  return `| ${name} | ${label} | ${format(data.times[key])} | ${format(lap.profile)} | ${driven} | ${shown} | ${format(lap.offTime)} | ${format(lap.deviation, 1)} |`;
}

console.log("| Piste | Ligne | Point matériel (s) | Profil de la bicyclette (s) | Piloté (s) | Écart | Hors piste (s) | Écart à la ligne (m) |");
console.log("|---|---|--:|--:|--:|--:|--:|--:|");
for (const name of names) {
  const track = readTrack(name);
  const data = JSON.parse(readFileSync(`data/lines/${name}.json`, "utf8"));
  for (const entry of Object.entries(LINES)) console.log(row(name, track, data, entry));
}
for (const [key, label] of Object.entries(LINES)) {
  const mean = gaps[key].reduce((sum, gap) => sum + gap, 0) / Math.max(1, gaps[key].length);
  console.log(`${label} : ${gaps[key].length}/${names.length} tours finis, ${format(100 * mean, 1)} % plus lents que le profil en moyenne`);
}
