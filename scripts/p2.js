import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pointMassF1 } from "../src/car.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createShape, fitGenes } from "../src/line/spline.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { createLineScore } from "../src/search/line-score.js";
import { searchClimb, searchCmaes } from "../src/search/line-search.js";
import { readTrack } from "./lib/tracks.js";

/**
 * `node scripts/p2.js Track [--seeds 3] [--budgets 20000,100000] [--spacings 40,80]`: the measure of P2
 * (docs/recherche/pistes.md) on one track, one queue job a track. CMA-ES and the climb, from the minimum-curvature
 * line (all genes zero) and from the centre line (fitted), at each budget, gene spacing and seed; one JSON line a run
 * in tmp/p2/<Track>.jsonl, then `node scripts/p2-summary.js` pairs them.
 */
const [name, ...rest] = process.argv.slice(2);
const option = (flag, fallback) => {
  const at = rest.indexOf(flag);
  return (at >= 0 ? rest[at + 1] : fallback).split(",").map(Number);
};
const seeds = option("--seeds", "3")[0];
const budgets = option("--budgets", "20000,100000");
const spacings = option("--spacings", "40,80");
const SEARCHES = { cmaes: searchCmaes, climb: searchClimb };

const car = pointMassF1();
const track = readTrack(name);
const bounds = lineBounds(track);
const base = minCurvatureLine(track, bounds).offsets;
const out = `tmp/p2/${name}.jsonl`;
mkdirSync("tmp/p2", { recursive: true });
const minCurvature = lapTime(car, linePoints(track, base), createProfile(track.count));
writeFileSync(out, `${JSON.stringify({ track: name, minCurvature, points: track.count })}\n`);

/** One run, appended to the track's lines. */
function runOne(shape, { spacing, start, genes, budget, seed, method }) {
  const scorer = createLineScore(track, car, shape);
  const started = performance.now();
  const result = SEARCHES[method](scorer, { start: genes, budget, seed, every: budget / 10 });
  const seconds = (performance.now() - started) / 1000;
  const row = { track: name, spacing, genes: shape.genes, start, budget, seed, method, time: result.time, evaluations: result.evaluations, seconds, curve: result.curve };
  appendFileSync(out, `${JSON.stringify(row)}\n`);
}

/** Every run of one gene spacing: each start, budget and seed, CMA-ES and the climb side by side. */
function runSpacing(spacing) {
  const shape = createShape(track, bounds, { spacing, base });
  const starts = { minCurvature: new Float64Array(shape.genes), centre: fitGenes(shape, new Float64Array(track.count)) };
  const seedList = Array.from({ length: seeds }, (_, k) => k + 1);
  const runs = [];
  for (const [start, genes] of Object.entries(starts)) {
    for (const budget of budgets) runs.push(...seedList.map((seed) => ({ spacing, start, genes, budget, seed })));
  }
  for (const run of runs) for (const method of Object.keys(SEARCHES)) runOne(shape, { ...run, method });
}

for (const spacing of spacings) runSpacing(spacing);
console.log(`${name} : ${out}`);
