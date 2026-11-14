import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pointMassF1 } from "../src/car.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createShape, placeGenes } from "../src/line/spline.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { createLineScore } from "../src/search/line-score.js";
import { searchClimb, searchCmaes } from "../src/search/line-search.js";
import { searchCoarseToFine } from "../src/search/refine.js";
import { searchWindowCmaes } from "../src/search/window-cmaes.js";
import { readTrack } from "./lib/tracks.js";

/**
 * `node scripts/p3.js Track cmaes|fine|finer [--seeds 3]`, one queue job a track and a part (docs/ligne-cmaes.md, §§ 4-8):
 * - `cmaes`: CMA-ES again at 40 m from the minimum-curvature line, a population four times the default, a step of
 *   0.1, by windows of 12 genes, against the climb, at 20 000 and 100 000 lines;
 * - `fine`: the climb at 40, 20 and 10 m, and from coarse to fine (40 → 20, 80 → 40 → 20), at 100 000 and 300 000;
 * - `finer`: from coarse to fine down to 10 m (40 → 20 → 10, 20 → 10) against 40 → 20, at 100 000 and 300 000.
 * One JSON line a run in tmp/p3/<Track>-<part>.jsonl; the lines of seed 1 in tmp/p3/lines/<Track>-<part>.json (the
 * check of P2 reads the climb's at 40 m and 100 000 lines).
 */
const [name, part, ...rest] = process.argv.slice(2);
const seeds = rest.includes("--seeds") ? Number(rest[rest.indexOf("--seeds") + 1]) : 3;
const car = pointMassF1();
const track = readTrack(name);
const bounds = lineBounds(track);
const base = minCurvatureLine(track, bounds).offsets;
const problem = { track, car, bounds, base };
const minCurvature = lapTime(car, linePoints(track, base), createProfile(track.count));

/** A search over genes every `spacing` metres from the minimum-curvature line, its line as offsets. */
function onGenes(spacing, search, settings = (_shape) => ({})) {
  return ({ budget, seed }) => {
    const shape = createShape(track, bounds, { spacing, base });
    const result = search(createLineScore(track, car, shape), { start: new Float64Array(shape.genes), budget, seed, every: budget / 10, ...settings(shape) });
    const offsets = new Float64Array(track.count);
    placeGenes(shape, result.genes, offsets);
    return { time: result.time, evaluations: result.evaluations, curve: result.curve, genes: shape.genes, offsets };
  };
}

const defaultPopulation = (shape) => 4 + Math.floor(3 * Math.log(shape.genes));
const PARTS = {
  cmaes: {
    budgets: [20000, 100000],
    methods: {
      climb: onGenes(40, searchClimb),
      cmaesPopulation4: onGenes(40, searchCmaes, (shape) => ({ population: 4 * defaultPopulation(shape) })),
      cmaesSigma01: onGenes(40, searchCmaes, () => ({ sigma: 0.1 })),
      cmaesWindows: onGenes(40, searchWindowCmaes),
    },
  },
  fine: {
    budgets: [100000, 300000],
    methods: {
      climb40: onGenes(40, searchClimb),
      climb20: onGenes(20, searchClimb),
      climb10: onGenes(10, searchClimb),
      coarse40to20: ({ budget, seed }) => searchCoarseToFine(problem, { spacings: [40, 20], budget, seed, every: budget / 10 }),
      coarse80to20: ({ budget, seed }) => searchCoarseToFine(problem, { spacings: [80, 40, 20], budget, seed, every: budget / 10 }),
    },
  },
  finer: {
    budgets: [100000, 300000],
    methods: {
      coarse40to20: ({ budget, seed }) => searchCoarseToFine(problem, { spacings: [40, 20], budget, seed, every: budget / 10 }),
      coarse40to10: ({ budget, seed }) => searchCoarseToFine(problem, { spacings: [40, 20, 10], budget, seed, every: budget / 10 }),
      coarse20to10: ({ budget, seed }) => searchCoarseToFine(problem, { spacings: [20, 10], budget, seed, every: budget / 10 }),
    },
  },
};

const { budgets, methods } = PARTS[part];
const out = `tmp/p3/${name}-${part}.jsonl`;
mkdirSync("tmp/p3/lines", { recursive: true });
writeFileSync(out, `${JSON.stringify({ track: name, part, minCurvature, points: track.count })}\n`);
const lines = { track: name, minCurvature: [...base], runs: {} };
/** One run, its line kept for seed 1. */
function runOne(method, run, budget, seed) {
  const started = performance.now();
  const { offsets, ...result } = run({ budget, seed });
  const seconds = (performance.now() - started) / 1000;
  appendFileSync(out, `${JSON.stringify({ track: name, part, method, budget, seed, ...result, seconds })}
`);
  if (seed === 1) lines.runs[`${method}-${budget}`] = { time: result.time, offsets: [...offsets] };
}

for (const budget of budgets) {
  for (let seed = 1; seed <= seeds; seed += 1) for (const [method, run] of Object.entries(methods)) runOne(method, run, budget, seed);
}
writeFileSync(`tmp/p3/lines/${name}-${part}.json`, JSON.stringify(lines));
console.log(`${name} ${part} : ${out}`);
