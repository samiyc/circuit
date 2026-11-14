import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "mcts-commun/random.js";
import { pointMassF1 } from "../src/car.js";
import { curvatureAt } from "../src/geometry.js";
import { curvatureModel, stepObjective } from "../src/line/curvature-model.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createTimer, descendLapTime, lapTimeGradient } from "../src/search/time-descent.js";
import { roundedPolygon } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";

const F1 = pointMassF1();
const track = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
const bounds = lineBounds(track);
const minCurvature = minCurvatureLine(track, bounds).offsets;

describe("the linearised curvature", () => {
  it("matches the curvature's differences at each point", () => {
    const { jacobian } = curvatureModel(track, minCurvature);
    const n = track.count;
    const h = 1e-6;
    for (const i of [0, 37, 81, n - 1]) {
      for (const [q, k] of [[0, (i - 1 + n) % n], [1, i], [2, (i + 1) % n]]) {
        const moved = Float64Array.from(minCurvature);
        moved[k] += h;
        const { x, y } = linePoints(track, moved);
        const before = linePoints(track, minCurvature);
        const numeric = (curvatureAt(x, y, i) - curvatureAt(before.x, before.y, i)) / h;
        assert.ok(Math.abs(numeric - jacobian[3 * i + q]) < 1e-5 * (1 + Math.abs(numeric)), `${i} ${q}`);
      }
    }
  });

  it("gives the step model the gradient of its value", () => {
    const rng = createRng(5);
    const n = track.count;
    const g = Float64Array.from({ length: n }, () => rng.normal());
    const objective = stepObjective(g, curvatureModel(track, minCurvature), { stiffness: 100, damping: 1e-3 });
    const d = Float64Array.from({ length: n }, () => 0.1 * rng.normal());
    const gradient = new Float64Array(n);
    const value = objective(d, gradient);
    const scratch = new Float64Array(n);
    for (const k of [3, 50, 120]) {
      d[k] += 1e-6;
      const numeric = (objective(d, scratch) - value) / 1e-6;
      d[k] -= 1e-6;
      assert.ok(Math.abs(numeric - gradient[k]) < 1e-3 * (1 + Math.abs(numeric)), `${k}`);
    }
  });
});

describe("the lap-time descent", () => {
  it("has the gradient of the lap time, the offsets left as they were", () => {
    const timer = createTimer(track, F1);
    const offsets = Float64Array.from(minCurvature);
    const gradient = new Float64Array(track.count);
    lapTimeGradient(timer, offsets, gradient);
    assert.deepEqual(offsets, minCurvature);
    assert.equal(timer.evaluations, 2 * track.count);
    const moved = Float64Array.from(minCurvature);
    moved[40] += 1e-3;
    const base = timer.time(minCurvature);
    assert.ok(Math.abs((timer.time(moved) - base) / 1e-3 - gradient[40]) < 1e-2);
  });

  it("beats the minimum curvature within the track and the budget, and replays", () => {
    const problem = { track, car: F1, bounds };
    const reference = createTimer(track, F1).time(minCurvature);
    const result = descendLapTime(problem, { start: minCurvature, budget: 30000 });
    assert.ok(result.time < reference - 0.01, `${result.time} ${reference}`);
    assert.ok(result.evaluations <= 30000);
    assert.equal(createTimer(track, F1).time(result.offsets), result.time);
    result.offsets.forEach((offset, i) => assert.ok(offset >= bounds.lower[i] - 1e-12 && offset <= bounds.upper[i] + 1e-12));
    assert.deepEqual(descendLapTime(problem, { start: minCurvature, budget: 30000 }).offsets, result.offsets);
  });
});
