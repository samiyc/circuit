import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "mcts-commun/random.js";
import { pointMassF1 } from "../src/car.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createShape, fitGenes, placeGenes } from "../src/line/spline.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { createLineScore } from "../src/search/line-score.js";
import { searchClimb, searchCmaes } from "../src/search/line-search.js";
import { searchCoarseToFine } from "../src/search/refine.js";
import { searchWindowCmaes } from "../src/search/window-cmaes.js";
import { roundedPolygon } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";

const F1 = pointMassF1();
const track = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
const bounds = lineBounds(track);
const minCurvature = minCurvatureLine(track, bounds).offsets;

describe("a line of genes", () => {
  const shape = createShape(track, bounds, { spacing: 40, base: minCurvature });

  it("has a gene about every 40 m, and draws its base when all are zero", () => {
    assert.equal(shape.genes, Math.round(4 * (200 + (Math.PI / 2) * 30) / 40));
    const offsets = new Float64Array(track.count);
    placeGenes(shape, new Float64Array(shape.genes), offsets);
    assert.deepEqual(offsets, minCurvature);
  });

  it("moves the whole line by c·scale when every gene is c (the weights sum to one), within the bounds", () => {
    const offsets = new Float64Array(track.count);
    const flat = createShape(track, bounds, { spacing: 40 });
    placeGenes(flat, new Float64Array(flat.genes).fill(0.2), offsets);
    for (const offset of offsets) assert.ok(Math.abs(offset - 0.2 * flat.scale) < 1e-12);
    const rng = createRng(3);
    placeGenes(flat, Float64Array.from({ length: flat.genes }, () => 20 * rng.normal()), offsets);
    offsets.forEach((offset, i) => assert.ok(offset >= bounds.lower[i] && offset <= bounds.upper[i]));
  });

  it("fits back the genes of a line it drew, within the bounds", () => {
    const flat = createShape(track, bounds, { spacing: 40 });
    const rng = createRng(4);
    const genes = Float64Array.from({ length: flat.genes }, () => 0.1 * rng.normal());
    const offsets = new Float64Array(track.count);
    placeGenes(flat, genes, offsets);
    const fitted = fitGenes(flat, offsets);
    fitted.forEach((gene, k) => assert.ok(Math.abs(gene - genes[k]) < 1e-4, `${k}: ${gene} against ${genes[k]}`));
  });
});

describe("the searches of P2", () => {
  const shape = createShape(track, bounds, { spacing: 40, base: minCurvature });
  const centre = fitGenes(shape, new Float64Array(track.count));

  it("score a line by its lap time, as the profile does", () => {
    const scorer = createLineScore(track, F1, shape);
    const expected = lapTime(F1, linePoints(track, minCurvature), createProfile(track.count));
    assert.equal(scorer.time(new Float64Array(shape.genes)), expected);
    assert.equal(scorer.score(new Float64Array(shape.genes)), -expected);
    assert.equal(scorer.evaluations, 2);
  });

  for (const [name, search] of [
    ["CMA-ES", searchCmaes],
    ["the climb", searchClimb],
  ]) {
    it(`${name}: improves on its start within its budget, and replays from its seed`, () => {
      const run = () => search(createLineScore(track, F1, shape), { start: centre, budget: 1500, seed: 7, every: 500 });
      const first = run();
      const startTime = createLineScore(track, F1, shape).time(centre);
      assert.ok(first.time < startTime - 0.1, `${first.time} from ${startTime}`);
      assert.ok(first.evaluations <= 1500);
      assert.equal(first.curve.length, Math.floor(first.evaluations / 500));
      assert.ok(Math.abs(createLineScore(track, F1, shape).time(first.genes) - first.time) < 1e-12);
      assert.deepEqual(run(), first);
    });
  }
});

describe("the variants of the J2 measure", () => {
  const shape = createShape(track, bounds, { spacing: 40, base: minCurvature });
  const centre = fitGenes(shape, new Float64Array(track.count));

  it("CMA-ES by windows improves on its start within its budget, and replays from its seed", () => {
    const run = () => searchWindowCmaes(createLineScore(track, F1, shape), { start: centre, budget: 2000, seed: 3, width: 8, stride: 4, chunk: 200 });
    const first = run();
    assert.ok(first.time < createLineScore(track, F1, shape).time(centre) - 0.1);
    assert.ok(first.evaluations <= 2000);
    assert.ok(Math.abs(createLineScore(track, F1, shape).time(first.genes) - first.time) < 1e-12);
    assert.deepEqual(run(), first);
  });

  it("CMA-ES takes a larger population", () => {
    const result = searchCmaes(createLineScore(track, F1, shape), { start: centre, budget: 1000, seed: 1, population: 40 });
    assert.equal(result.evaluations, 1 + 40 * 24);
  });

  it("from coarse to fine: each stage starts from the last, the finest line in its bounds", () => {
    const problem = { track, car: F1, bounds, base: minCurvature };
    const result = searchCoarseToFine(problem, { spacings: [80, 40], budget: 2000, seed: 2 });
    const reference = lapTime(F1, linePoints(track, minCurvature), createProfile(track.count));
    assert.ok(result.time < reference, `${result.time} against ${reference}`);
    assert.equal(result.genes, createShape(track, bounds, { spacing: 40 }).genes);
    assert.ok(Math.abs(lapTime(F1, linePoints(track, result.offsets), createProfile(track.count)) - result.time) < 1e-12);
    result.offsets.forEach((offset, i) => assert.ok(offset >= bounds.lower[i] && offset <= bounds.upper[i]));
    assert.deepEqual(searchCoarseToFine(problem, { spacings: [80, 40], budget: 2000, seed: 2 }), result);
  });
});
