import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "mcts-commun/random.js";
import { pointMassF1 } from "../src/car.js";
import { closedLength } from "../src/geometry.js";
import { descend } from "../src/line/descent.js";
import { clampOffsets, lineBounds, linePoints } from "../src/line/line.js";
import { curvatureObjective, lengthObjective } from "../src/line/objectives.js";
import { centreLine, minCurvatureLine, referenceLines, shortestLine } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { ring, roundedPolygon, stadium } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";

const F1 = pointMassF1();
const lap = (track, offsets) => {
  return lapTime(F1, linePoints(track, offsets), createProfile(track.count));
};

/** The analytic gradient against central differences, at seeded offsets. */
function assertGradient(objective, track, seed) {
  const rng = createRng(seed);
  const offsets = Float64Array.from({ length: track.count }, () => 3 * (rng.next() - 0.5));
  const gradient = new Float64Array(track.count);
  objective(offsets, gradient);
  const scratch = new Float64Array(track.count);
  for (const i of [0, 7, Math.floor(track.count / 2), track.count - 1]) {
    const h = 1e-6;
    offsets[i] += h;
    const up = objective(offsets, scratch);
    offsets[i] -= 2 * h;
    const down = objective(offsets, scratch);
    offsets[i] += h;
    const numeric = (up - down) / (2 * h);
    assert.ok(Math.abs(numeric - gradient[i]) <= 1e-5 * Math.max(1, Math.abs(numeric)), `${i}: ${gradient[i]} against ${numeric}`);
  }
}

describe("the bounds of a line", () => {
  it("are the edges less half the car, and pin a point narrower than the car", () => {
    const raw = ring(50, 8, 10);
    raw.wLeft[3] = 0.5;
    raw.wRight[3] = 0.9;
    const { lower, upper } = lineBounds(createTrack(raw), 1);
    assert.equal(lower[0], -4);
    assert.equal(upper[0], 4);
    assert.ok(Math.abs(lower[3] + 0.2) < 1e-12 && lower[3] === upper[3]);
    const offsets = Float64Array.of(-9, 9, 0, 0, 0, 0, 0, 0);
    clampOffsets(offsets, { lower, upper });
    assert.deepEqual([...offsets.slice(0, 4)], [-4, 4, 0, lower[3]]);
  });
});

describe("the projected descent", () => {
  it("finds the minimum of a quadratic in a box, clamped where the box cuts it", () => {
    const target = [3, -2, 0.5];
    const objective = (x, gradient) => {
      let value = 0;
      for (let i = 0; i < 3; i += 1) {
        gradient[i] = 2 * (i + 1) * (x[i] - target[i]);
        value += (i + 1) * (x[i] - target[i]) ** 2;
      }
      return value;
    };
    const x = new Float64Array(3);
    const bounds = { lower: Float64Array.of(-1, -1, -1), upper: Float64Array.of(1, 1, 1) };
    descend(objective, x, bounds, { tolerance: 0, iterations: 500 });
    assert.ok(Math.abs(x[0] - 1) < 1e-9 && Math.abs(x[1] + 1) < 1e-9 && Math.abs(x[2] - 0.5) < 1e-6, `${x}`);
  });
});

describe("the scores of the reference lines", () => {
  const track = createTrack(stadium({ straight: 200, radius: 40, spacing: 5, width: 12 }));

  it("give the length's exact gradient", () => assertGradient(lengthObjective(track), track, 1));
  it("give the bending energy's exact gradient", () => assertGradient(curvatureObjective(track), track, 2));

  it("score the line itself: its length, and ∫κ²·ds = 2π/R on a ring", () => {
    const disc = createTrack(ring(60, 720, 10));
    const zero = new Float64Array(disc.count);
    const gradient = new Float64Array(disc.count);
    assert.ok(Math.abs(lengthObjective(disc)(zero, gradient) - closedLength(disc.x, disc.y)) < 1e-9);
    assert.ok(Math.abs(curvatureObjective(disc)(zero, gradient) - (2 * Math.PI) / 60) < 1e-4);
  });
});

describe("the three reference lines", () => {
  it("on a ring: the shortest hugs the inside, the minimum curvature the outside", () => {
    const track = createTrack(ring(60, 120, 14));
    const bounds = lineBounds(track, 1);
    const shortest = shortestLine(track, bounds).offsets;
    const widest = minCurvatureLine(track, bounds).offsets;
    for (let i = 0; i < track.count; i += 1) {
      assert.ok(Math.abs(shortest[i] - bounds.upper[i]) < 1e-6, `shortest at ${i}: ${shortest[i]}`);
      assert.ok(Math.abs(widest[i] - bounds.lower[i]) < 1e-6, `min curvature at ${i}: ${widest[i]}`);
    }
  });

  it("on a rounded square: outside, apex, outside for the minimum curvature, faster than the centre and the shortest", () => {
    // 50 steps of straight, then a quarter turn of 12: its apex is point 56.
    const track = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
    const { bounds, centre, shortest, minCurvature } = referenceLines(track);
    assert.ok(minCurvature[56] > bounds.upper[56] - 0.1, `the apex: ${minCurvature[56]}`);
    for (const outside of [25, 40]) {
      assert.ok(minCurvature[outside] < bounds.lower[outside] + 0.5, `before the turn: ${minCurvature[outside]}`);
    }
    const times = [centre, shortest, minCurvature].map((offsets) => lap(track, offsets));
    assert.ok(times[2] < times[0] && times[2] < times[1], `${times}`);
    const lengths = [centre, shortest].map((offsets) => closedLength(linePoints(track, offsets).x, linePoints(track, offsets).y));
    assert.ok(lengths[1] < lengths[0]);
  });

  it("start from the centre, clamped where the track is lopsided", () => {
    const raw = ring(50, 8, 10);
    raw.wLeft.fill(0.5);
    raw.wRight.fill(9.5);
    const track = createTrack(raw);
    assert.ok(centreLine(track, lineBounds(track, 1)).every((offset) => offset === -0.5));
  });
});

describe("the half turn of a stadium", () => {
  it("is taken on the outside edge: no wider arc fits between the outer edges of two parallel straights", () => {
    const track = createTrack(stadium({ straight: 300, radius: 30, spacing: 4, width: 14 }));
    const bounds = lineBounds(track);
    const { offsets } = minCurvatureLine(track, bounds);
    assert.ok(Math.abs(offsets[75 + 12] - bounds.lower[75 + 12]) < 0.05, `${offsets[87]}`);
  });
});
