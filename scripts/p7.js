import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClimb } from "mcts-commun/climb.js";
import { createCmaes } from "mcts-commun/cmaes.js";
import { createRng } from "mcts-commun/random.js";
import { createBicycle, profileCar } from "../src/drive/bicycle.js";
import { PURSUIT, createPursuit, pathOf, pursue } from "../src/drive/pursuit.js";
import { driveLap, startOf } from "../src/drive/run.js";
import { createLap } from "../src/view/lap.js";
import { TRACK_NAMES, linesOption, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * P7, the pure-pursuit driver tuned (docs/pilote.md § 6): its six settings, each gene in [0, 1] mapped onto a range,
 * scored on the tracks of even rank (the minimum-curvature line and the best one) and checked on the others. A lap
 * scores its time over the profile's, less one, plus its seconds off the track over the profile; a lap not finished
 * scores FAILED. Two searches at an equal budget of plans from the hand rule: CMA-ES (`search=cmaes`, `generations`
 * of its population) or the library's hill climb (`search=climb`, one gene moved, kept in its range), the third
 * comparison after economie's R3 (board, 16/11). `--bicycle`: the lines of data/lines-bicycle/.
 * `node scripts/p7.js [search=cmaes] [seed=1] [generations=40] [--bicycle]`, about 3 min: through the queue.
 */
const RANGES = {
  lookTime: [0.1, 0.6],
  lookMin: [1, 20],
  margin: [0.9, 1.05],
  gain: [0.02, 0.5],
  anticipation: [0, 0.8],
  crossGain: [0, 3],
};
const GENES = Object.keys(RANGES).length;
const FAILED = 0.5;
const SIGMA = 0.2;
const LINES = ["minCurvature", "best"];
const CAR = createBicycle();

const clamp = (gene) => Math.min(1, Math.max(0, gene));
/** @param {Float64Array | number[]} genes @returns {import("../src/drive/pursuit.js").Settings} */
const settingsOf = (genes) => /** @type {any} */ (Object.fromEntries(Object.entries(RANGES).map(([key, [low, high]], i) => [key, low + clamp(genes[i]) * (high - low)])));
/** @param {import("../src/drive/pursuit.js").Settings} settings */
const genesOf = (settings) => Float64Array.from(Object.entries(RANGES).map(([key, [low, high]]) => (settings[key] - low) / (high - low)));

/** Every (track, line) to drive, its path made once. */
function coursesOf(names, dir) {
  return names.flatMap((name) => {
    const track = readTrack(name);
    const data = JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8"));
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

/** The training score of a plan of genes, the best so far kept after each plan (the curve of the measure). */
function scorerOf(train) {
  const curve = [];
  return {
    curve,
    score(genes) {
      const score = evaluate(train, settingsOf(genes)).score;
      curve.push(Math.min(score, curve.at(-1) ?? Infinity));
      return score;
    },
  };
}

/** CMA-ES from the hand rule: `generations` of its population. */
function tuneCmaes(scorer, { seed, generations }) {
  const strategy = createCmaes({ genes: GENES, mean: genesOf(PURSUIT), sigma: SIGMA, seed });
  for (let g = 0; g < generations; g += 1) {
    strategy.tell(strategy.ask().map((plan) => -scorer.score(plan)));
    console.log(`génération ${g + 1} : ${scorer.curve.at(-1).toFixed(4)}`);
  }
  return Float64Array.from(strategy.best.plan);
}

/** The hill climb from the hand rule, as many plans: one gene moved by a normal draw, kept in [0, 1]. */
function tuneClimb(scorer, { seed, budget }) {
  const problem = {
    start: (plan) => plan.set(genesOf(PURSUIT)),
    score: (plan) => -scorer.score(plan),
    mutate(child, best, amplitude, rng) {
      child.set(best);
      const at = rng.int(GENES);
      child[at] = clamp(child[at] + SIGMA * amplitude * rng.normal());
    },
    fresh: (plan) => plan.set(genesOf(PURSUIT)),
  };
  return Float64Array.from(createClimb({ genes: GENES }).run(problem, { budget, rng: createRng(seed), freshEvery: Infinity }).plan);
}

function main() {
  if (!tracksDownloaded()) throw new Error("Les pistes manquent : npm run tracks");
  const option = linesOption(process.argv.slice(2));
  const args = Object.fromEntries(option.rest.map((arg) => arg.split("=")));
  const [search, seed, generations] = [args.search ?? "cmaes", Number(args.seed ?? 1), Number(args.generations ?? 40)];
  const train = coursesOf(TRACK_NAMES.filter((_, i) => i % 2 === 0), option.dir);
  const test = coursesOf(TRACK_NAMES.filter((_, i) => i % 2 === 1), option.dir);
  const scorer = scorerOf(train);
  const budget = generations * createCmaes({ genes: GENES, mean: genesOf(PURSUIT), sigma: SIGMA }).population;
  const plan = search === "climb" ? tuneClimb(scorer, { seed, budget }) : tuneCmaes(scorer, { seed, generations });
  const best = settingsOf(plan);
  const result = { search, seed, lines: option.dir, plans: scorer.curve.length, settings: best, default: { train: evaluate(train, PURSUIT), test: evaluate(test, PURSUIT) }, tuned: { train: evaluate(train, best), test: evaluate(test, best) }, curve: scorer.curve };
  mkdirSync("tmp/p7", { recursive: true });
  writeFileSync(`tmp/p7/${search}${option.bicycle ? "-bicycle" : ""}-seed-${seed}.json`, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ settings: best, default: result.default, tuned: result.tuned }, null, 1));
}

main();
