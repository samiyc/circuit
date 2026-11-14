import { pointMassF1 } from "../src/car.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { searchCoarseToFine } from "../src/search/refine.js";
import { readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * `npm run search-bench [-- budget=100000 seeds=1 spacings=40,20,10 Piste…]`: the search of reference
 * (docs/ligne-cmaes.md, § 7: the climb from coarse to fine, genes every 40 m, then 20 m, then 10 m, from the
 * minimum-curvature line) on a few tracks, its gain on the minimum curvature and its cost, to follow from one commit
 * to the next. Seeded: the same arguments give the same times. About 10 s a track and a seed at 100 000 lines; longer
 * runs go through the queue.
 */
const DEFAULT_TRACKS = ["Monza", "Budapest", "Silverstone"];
const args = process.argv.slice(2);
const settings = Object.fromEntries(args.filter((arg) => arg.includes("=")).map((arg) => arg.split("=")));
const budget = Number(settings.budget ?? 100000);
const seeds = Number(settings.seeds ?? 1);
const spacings = (settings.spacings ?? "40,20,10").split(",").map(Number);
const named = args.filter((arg) => !arg.includes("="));
const tracks = named.length ? named : DEFAULT_TRACKS;
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");

/** One track: the minimum curvature, then the search on each seed. */
function benchTrack(name) {
  const car = pointMassF1();
  const track = readTrack(name);
  const bounds = lineBounds(track);
  const base = minCurvatureLine(track, bounds).offsets;
  const reference = lapTime(car, linePoints(track, base), createProfile(track.count));
  const rows = [];
  for (let seed = 1; seed <= seeds; seed += 1) {
    const started = performance.now();
    const result = searchCoarseToFine({ track, car, bounds, base }, { spacings, budget, seed });
    const seconds = (performance.now() - started) / 1000;
    rows.push({ seed, time: result.time, gain: reference - result.time, seconds, perLine: (seconds * 1e6) / result.evaluations });
  }
  return { name, points: track.count, reference, rows };
}

if (!tracksDownloaded()) {
  console.log("Les pistes manquent : npm run tracks");
  process.exit(1);
}
console.log(`Du grossier au fin (${spacings.join(" → ")} m), ${budget} lignes, ${seeds} graine(s)\n`);
console.log("| Piste | Points | Courbure min. (s) | Graine | Temps (s) | Gain (s) | Calcul (s) | µs par ligne |");
console.log("|---|---|---|---|---|---|---|---|");
let total = 0;
for (const name of tracks) {
  const { points, reference, rows } = benchTrack(name);
  for (const row of rows) {
    total += row.gain;
    console.log(`| ${name} | ${points} | ${decimal(reference)} | ${row.seed} | ${decimal(row.time)} | ${decimal(row.gain)} | ${decimal(row.seconds, 1)} | ${decimal(row.perLine, 0)} |`);
  }
}
console.log(`\nGain moyen : ${decimal(total / (tracks.length * seeds), 3)} s`);
