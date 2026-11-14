import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointMassF1 } from "../src/car.js";
import { lineBounds } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { roundedPolygon } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";
import { SPEED_RAMP, rampColour, speedColour } from "../src/view/colours.js";
import { boxAround, boxOf, fitFrame, project } from "../src/view/frame.js";
import { createLap, gainBetween, placeAt, positionAt, timeGap } from "../src/view/lap.js";

const F1 = pointMassF1();

describe("a lap on the page", () => {
  const track = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
  const bounds = lineBounds(track);
  const centre = createLap(track, F1, new Float64Array(track.count));
  const best = createLap(track, F1, minCurvatureLine(track, bounds).offsets);

  it("has a clock from 0 to the lap time, rising at every point", () => {
    assert.equal(centre.clock[0], 0);
    assert.equal(centre.clock[track.count], centre.time);
    for (let i = 0; i < track.count; i += 1) assert.ok(centre.clock[i + 1] > centre.clock[i]);
  });

  it("places a car on its step by time, and wraps after a lap", () => {
    const i = 57;
    const middle = (best.clock[i] + best.clock[i + 1]) / 2;
    const place = placeAt(best.clock, middle);
    assert.equal(place.index, i);
    assert.ok(Math.abs(place.fraction - 0.5) < 1e-9);
    const again = placeAt(best.clock, middle + 3 * best.time);
    assert.equal(again.index, i);
    assert.ok(Math.abs(again.fraction - 0.5) < 1e-9);
    const start = positionAt(best, 0);
    assert.equal(start.index, 0);
    assert.ok(Math.abs(start.x - best.x[0]) < 1e-12 && Math.abs(start.y - best.y[0]) < 1e-12);
  });

  it("reads the gap point by point, its last entry the difference of the lap times", () => {
    const gap = timeGap(best, centre);
    assert.equal(gap[0], 0);
    assert.ok(Math.abs(gap[track.count] - (centre.time - best.time)) < 1e-12);
    assert.ok(centre.time > best.time);
  });

  it("times each step at its mean speed, as the lap time counts it", () => {
    const { step, speed } = best.profile;
    for (const i of [0, 40, track.count - 1]) {
      const next = i + 1 < track.count ? i + 1 : 0;
      assert.ok(Math.abs(best.clock[i + 1] - best.clock[i] - (2 * step[i]) / (speed[i] + speed[next])) < 1e-12);
    }
  });
});

describe("the gain between two points", () => {
  it("reads the gap forwards, and past the start", () => {
    const gap = Float64Array.from([0, 0.1, 0.3, 0.2, 0.5]);
    assert.ok(Math.abs(gainBetween(gap, 1, 3) - 0.1) < 1e-12);
    assert.ok(Math.abs(gainBetween(gap, 3, 1) - (0.5 - 0.2 + 0.1)) < 1e-12);
    assert.equal(gainBetween(gap, 2, 2), 0);
  });
});

describe("the colours of speed", () => {
  it("runs from the first stop to the last, clamped outside", () => {
    assert.deepEqual(rampColour(50, 50, 80), [...SPEED_RAMP[0]]);
    assert.deepEqual(rampColour(80, 50, 80), [...SPEED_RAMP[SPEED_RAMP.length - 1]]);
    assert.deepEqual(rampColour(10, 50, 80), rampColour(50, 50, 80));
    assert.deepEqual(rampColour(99, 50, 80), rampColour(80, 50, 80));
    assert.equal(speedColour(60, 60, 60), `rgb(${SPEED_RAMP[SPEED_RAMP.length - 1].join(" ")})`);
  });

  it("hits the middle stops in between", () => {
    assert.deepEqual(rampColour(60, 50, 80), [...SPEED_RAMP[1]]);
    assert.deepEqual(rampColour(70, 50, 80), [...SPEED_RAMP[2]]);
  });
});

describe("the frame", () => {
  it("fits the box with its aspect kept, centred, north up", () => {
    const box = boxOf({ x: [0, 100], y: [0, 50] });
    assert.deepEqual(box, { minX: 0, minY: 0, maxX: 100, maxY: 50 });
    const frame = fitFrame(box, 220, 220, 10);
    assert.equal(frame.scale, 2);
    assert.deepEqual(project(frame, 50, 25), [110, 110]);
    assert.deepEqual(project(frame, 0, 50), [10, 60]);
    assert.deepEqual(project(frame, 100, 0), [210, 160]);
  });

  it("zooms on a point", () => {
    const frame = fitFrame(boxAround(10, 20, 5), 100, 100, 0);
    assert.equal(frame.scale, 10);
    assert.deepEqual(project(frame, 10, 20), [50, 50]);
  });
});
