import { readFileSync } from "node:fs";
import { PURSUIT, TUNED } from "../src/drive/pursuit.js";
import { driveLine } from "../src/drive/run.js";
import { TRACK_NAMES, linesOption, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * `npm run drive [-- Piste…]`: the car that slips (J4) driven by the pure-pursuit driver on the lines of
 * `npm run lines` (data/lines/), the best one and the minimum-curvature one, against the profile of that car: the rule
 * set by hand, and the one P7 tuned. A lap is about 15 ms: the 25 tracks take three seconds, beside the queue.
 * `--bicycle`: the lines searched for that profile (data/lines-bicycle/).
 */
if (!tracksDownloaded()) {
  console.log("Les pistes manquent : npm run tracks");
  process.exit(1);
}
const option = linesOption(process.argv.slice(2));
const names = option.rest.length ? option.rest : TRACK_NAMES;
const LINES = { best: "la meilleure", minCurvature: "courbure min." };
const RULES = { "à la main": PURSUIT, "réglée (P7)": TUNED };
const gaps = Object.fromEntries(Object.keys(RULES).map((rule) => [rule, { best: [], minCurvature: [] }]));
const format = (value, digits = 2) => value.toFixed(digits).replace(".", ",");

/** One rule's cells for a line: its time, its gap to the profile, its time off; the gap kept for the means. */
function cells(rule, track, offsets, key) {
  const lap = driveLine(track, offsets, { settings: RULES[rule] });
  const gap = lap.time / lap.profile - 1;
  if (lap.finished) gaps[rule][key].push(gap);
  const driven = lap.finished ? format(lap.time) : `arrêt à ${format(lap.time, 1)}`;
  const shown = lap.finished ? format(100 * gap, 1) + " %" : "–";
  return { profile: lap.profile, text: `${driven} | ${shown} | ${format(lap.offTime)}` };
}

/** One table row: the line's two profiles, and each rule's lap. */
function row(name, track, data, [key, label]) {
  const offsets = Float64Array.from(data.lines[key]);
  const laps = Object.keys(RULES).map((rule) => cells(rule, track, offsets, key));
  return `| ${name} | ${label} | ${format(data.times[key])} | ${format(laps[0].profile)} | ${laps.map((lap) => lap.text).join(" | ")} |`;
}

console.log("| Piste | Ligne | Point matériel (s) | Profil de la bicyclette (s) | À la main (s) | Écart | Hors piste (s) | Réglée (s) | Écart | Hors piste (s) |");
console.log("|---|---|--:|--:|--:|--:|--:|--:|--:|--:|");
for (const name of names) {
  const track = readTrack(name);
  const data = JSON.parse(readFileSync(`${option.dir}/${name}.json`, "utf8"));
  for (const entry of Object.entries(LINES)) console.log(row(name, track, data, entry));
}
for (const [rule, byLine] of Object.entries(gaps)) {
  for (const [key, label] of Object.entries(LINES)) {
    const mean = byLine[key].reduce((sum, gap) => sum + gap, 0) / Math.max(1, byLine[key].length);
    console.log(`${rule}, ${label} : ${byLine[key].length}/${names.length} tours finis, ${format(100 * mean, 1)} % plus lents que le profil en moyenne`);
  }
}
