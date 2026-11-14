import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pointMassF1 } from "../src/car.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { searchCoarseToFine } from "../src/search/refine.js";
import { descendLapTime } from "../src/search/time-descent.js";
import { readTrack } from "./lib/tracks.js";

/**
 * `node scripts/p4.js Track [--seeds 3]`, one queue job a track (docs/ligne-cmaes.md, § 8): the lap-time descent
 * against the search from coarse to fine (40 → 20 → 10 m), at equal lap times scored:
 * - `descent`: the descent from the minimum curvature, 300 000 lap times (its curve gives it at 100 000 too);
 * - `coarse`: from coarse to fine, 200 000 lines, on each seed;
 * - `polish`: from coarse to fine, 100 000 lines, then the descent from its line, 100 000 lap times, on each seed (the
 *   first half is kept as `coarse100k`).
 * One JSON line a run in tmp/p4/<Track>.jsonl; the lines of seed 1 in tmp/p4/lines/<Track>.json.
 */
const [name, ...rest] = process.argv.slice(2);
const seeds = rest.includes("--seeds") ? Number(rest[rest.indexOf("--seeds") + 1]) : 3;
const car = pointMassF1();
const track = readTrack(name);
const bounds = lineBounds(track);
const base = minCurvatureLine(track, bounds).offsets;
const problem = { track, car, bounds, base };
const minCurvature = lapTime(car, linePoints(track, base), createProfile(track.count));
const out = `tmp/p4/${name}.jsonl`;
mkdirSync("tmp/p4/lines", { recursive: true });
writeFileSync(out, `${JSON.stringify({ track: name, minCurvature, points: track.count })}\n`);
const lines = { track: name, minCurvature: [...base], runs: {} };

/** Runs one method, writes its line, keeps its offsets for seed 1 (and for `descent`, which draws nothing). */
function record(method, seed, run) {
  const started = performance.now();
  const { offsets, ...result } = run();
  const seconds = (performance.now() - started) / 1000;
  appendFileSync(out, `${JSON.stringify({ track: name, method, seed, ...result, seconds })}\n`);
  if (seed <= 1) lines.runs[method] = { time: result.time, offsets: [...offsets] };
  return offsets;
}

record("descent", 0, () => descendLapTime(problem, { start: base, budget: 300000 }));
for (let seed = 1; seed <= seeds; seed += 1) {
  record("coarse", seed, () => searchCoarseToFine(problem, { spacings: [40, 20, 10], budget: 200000, seed }));
  const half = record("coarse100k", seed, () => searchCoarseToFine(problem, { spacings: [40, 20, 10], budget: 100000, seed }));
  record("polish", seed, () => descendLapTime(problem, { start: half, budget: 100000 }));
}
writeFileSync(`tmp/p4/lines/${name}.json`, JSON.stringify(lines));
console.log(`${name} : ${out}`);
