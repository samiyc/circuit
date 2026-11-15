import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createCmaes } from "mcts-commun/cmaes.js";
import { createBicycle, profileCar } from "../src/drive/bicycle.js";
import { PURSUIT, createPursuit, pathOf, pursue } from "../src/drive/pursuit.js";
import { driveLap, startOf } from "../src/drive/run.js";
import { createLap } from "../src/view/lap.js";
import { TRACK_NAMES, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * P7, the pure-pursuit driver tuned (docs/pilote.md § 6): CMA-ES on its six settings, each gene in [0, 1] mapped onto
 * a range, scored on the tracks of even rank (the minimum-curvature line and the best one of data/lines/) and checked
 * on the others. A lap scores its time over the profile's, less one, plus its seconds off the track over the profile;
 * a lap not finished scores FAILED. `node scripts/p7.js [seed=1] [generations=40]`, about 3 min: through the queue.
 */
const RANGES = {
  lookTime: [0.1, 0.6],
  lookMin: [3, 20],
  margin: [0.9, 1.05],
  gain: [0.02, 0.5],
  anticipation: [0, 0.8],
  crossGain: [0, 3],
};
const FAILED = 0.5;
const LINES = ["minCurvature", "best"];
const CAR = createBicycle();

/** @param {Float64Array | number[]} genes @returns {import("../src/drive/pursuit.js").Settings} */
const settingsOf = (genes) => /** @type {any} */ (Object.fromEntries(Object.entries(RANGES).map(([key, [low, high]], i) => [key, low + Math.min(1, Math.max(0, genes[i])) * (high - low)])));
/** @param {import("../src/drive/pursuit.js").Settings} settings */
const genesOf = (settings) => Object.entries(RANGES).map(([key, [low, high]]) => (settings[key] - low) / (high - low));

/** Every (track, line) to drive, its path made once. */
function coursesOf(names) {
  return names.flatMap((name) => {
    const track = readTrack(name);
    const data = JSON.parse(readFileSync(`data/lines/${name}.json`, "utf8"));
    return LINES.map((line) => {
      const lap = createLap(track, profileCar(CAR), Float64Array.from(data.lines[line]));
      return { name, line, track, path: pathOf(lap, track), profile: lap.time };
    });
  });
}

/** A course driven with these settings: its score and its lap. */
function drive(course, settings) {
  const { track, path, profile } = course;
  const driver = createPursuit(path, settings);
  const lap = driveLap({ track, path, car: CAR, driver, drive: (state) => pursue(driver, CAR, state) }, { state: startOf(path, settings.margin) });
  return { score: lap.finished ? (lap.time + lap.offTime) / profile - 1 : FAILED, lap };
}

/** The mean score over the courses, and per line: the laps finished and the mean gap of those. */
function evaluate(courses, settings) {
  const runs = courses.map((course) => ({ course, ...drive(course, settings) }));
  const byLine = Object.fromEntries(
    LINES.map((line) => {
      const finished = runs.filter((run) => run.course.line === line && run.lap.finished);
      const gap = finished.reduce((sum, run) => sum + run.lap.time / run.course.profile - 1, 0) / Math.max(1, finished.length);
      const off = finished.reduce((sum, run) => sum + run.lap.offTime, 0);
      return [line, { finished: finished.length, of: runs.length / LINES.length, gap, off }];
    }),
  );
  return { score: runs.reduce((sum, run) => sum + run.score, 0) / runs.length, byLine };
}

function main() {
  if (!tracksDownloaded()) throw new Error("Les pistes manquent : npm run tracks");
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.split("=")));
  const [seed, generations] = [Number(args.seed ?? 1), Number(args.generations ?? 40)];
  const train = coursesOf(TRACK_NAMES.filter((_, i) => i % 2 === 0));
  const test = coursesOf(TRACK_NAMES.filter((_, i) => i % 2 === 1));
  const strategy = createCmaes({ genes: 6, mean: Float64Array.from(genesOf(PURSUIT)), sigma: 0.2, seed });
  const curve = [];
  for (let g = 0; g < generations; g += 1) {
    const plans = strategy.ask();
    strategy.tell(plans.map((plan) => -evaluate(train, settingsOf(plan)).score));
    curve.push(-strategy.best.score);
    console.log(`génération ${g + 1} : ${(-strategy.best.score).toFixed(4)}`);
  }
  const best = settingsOf(strategy.best.plan);
  const result = { seed, generations, settings: best, default: { train: evaluate(train, PURSUIT), test: evaluate(test, PURSUIT) }, tuned: { train: evaluate(train, best), test: evaluate(test, best) }, curve };
  mkdirSync("tmp/p7", { recursive: true });
  writeFileSync(`tmp/p7/seed-${seed}.json`, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ settings: best, default: result.default, tuned: result.tuned }, null, 1));
}

main();
