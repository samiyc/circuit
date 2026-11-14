import { mkdirSync, writeFileSync } from "node:fs";
import { pointMassF1 } from "../src/car.js";
import { linePoints } from "../src/line/line.js";
import { referenceLines } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { bestLine } from "../src/search/best-line.js";
import { TRACK_NAMES, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * `npm run lines [-- Piste…]`: the lines the page shows (web/, J3), computed once into data/lines/<Track>.json (git
 * ignores data/): the three references, the search from coarse to fine and the same finished by the lap-time descent
 * (src/search/best-line.js, seed 1, 100 000 lap times each). About 25 s a track: all 25 go through the queue. Without
 * them the page computes the references itself, and the search on demand.
 */
if (!tracksDownloaded()) {
  console.log("Les pistes manquent : npm run tracks");
  process.exit(1);
}
const names = process.argv.slice(2).length ? process.argv.slice(2) : TRACK_NAMES;
const car = pointMassF1();
mkdirSync("data/lines", { recursive: true });
for (const name of names) {
  const started = performance.now();
  const track = readTrack(name);
  const { bounds, centre, shortest, minCurvature } = referenceLines(track);
  const { search, best } = bestLine({ track, car, bounds, base: minCurvature }, { seed: 1 });
  const lines = { centre, shortest, minCurvature, search, best };
  const times = Object.fromEntries(Object.entries(lines).map(([key, offsets]) => [key, lapTime(car, linePoints(track, offsets), createProfile(track.count))]));
  const data = { track: name, made: new Date().toISOString(), seed: 1, budget: 100000, times, lines: Object.fromEntries(Object.entries(lines).map(([key, offsets]) => [key, [...offsets]])) };
  writeFileSync(`data/lines/${name}.json`, JSON.stringify(data));
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  console.log(`${name} : courbure min. ${times.minCurvature.toFixed(2)} s, la meilleure ${times.best.toFixed(2)} s (${seconds} s)`);
}
