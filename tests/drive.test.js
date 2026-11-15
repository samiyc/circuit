import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointMassF1 } from "../src/car.js";
import { CHASSIS, createBicycle, createCarState, profileCar, stepCar } from "../src/drive/bicycle.js";
import { createPursuit, gripLeft, nearestPoint, pathOf, pedalFor } from "../src/drive/pursuit.js";
import { driveLine, pastEdge, sideOf } from "../src/drive/run.js";
import { PL_TYRE, lateralShare, peakSlip } from "../src/drive/tyre.js";
import { lineBounds } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { cornerSpeed, driveAcceleration } from "../src/profile/grip.js";
import { ring, roundedPolygon } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";
import { createLap } from "../src/view/lap.js";

const CAR = createBicycle();
const DEGREE = Math.PI / 180;

describe("the tyre", () => {
  it("peaks at the peak slip, 9° light and 8° loaded, held outside the table", () => {
    assert.equal(peakSlip(PL_TYRE, 1000), 9 * DEGREE);
    assert.equal(peakSlip(PL_TYRE, 9000), 8 * DEGREE);
    assert.ok(Math.abs(peakSlip(PL_TYRE, 4000) - 8.5 * DEGREE) < 1e-12);
    assert.ok(Math.abs(lateralShare(PL_TYRE, 9 * DEGREE, 2000) - 1) < 1e-12);
  });

  it("is odd, rises to the peak, then falls", () => {
    const at = (degrees) => lateralShare(PL_TYRE, degrees * DEGREE, 2000);
    assert.equal(at(-4), -at(4));
    assert.ok(at(2) < at(5) && at(5) < at(9));
    assert.ok(at(18) < at(12) && at(12) < at(9));
  });
});

describe("the car that slips", () => {
  it("goes straight on with no slip, as the point mass where the power bounds it, faster where the grip does", () => {
    const accelerate = (speed) => {
      const state = createCarState({ x: 0, y: 0, heading: 0, speed });
      state.pedal = 1;
      stepCar(CAR, state, { steer: 0, pedal: 1 }, 0.01);
      assert.equal(state.v, 0);
      assert.equal(state.r, 0);
      return state.ax;
    };
    const fast = driveAcceleration(CAR.point, 80, 0);
    assert.ok(Math.abs(accelerate(80) / fast - 1) < 0.01, `${accelerate(80)} m/s² against ${fast}`);
    // At 40 m/s the rear's traction bounds it, and the rear carries 55 % of the downforce and the load transfer.
    assert.ok(accelerate(40) > driveAcceleration(CAR.point, 40, 0));
  });

  it("turns left on a left lock, and replays to the bit", () => {
    const run = () => {
      const state = createCarState({ x: 0, y: 0, heading: 0, speed: 30 });
      for (let k = 0; k < 100; k += 1) stepCar(CAR, state, { steer: 0.05, pedal: 0.2 }, 0.01);
      return state;
    };
    const [one, two] = [run(), run()];
    assert.ok(one.r > 0 && one.y > 0 && one.heading > 0);
    assert.deepEqual(one, two);
  });

  it("keeps the lock within its limit", () => {
    const state = createCarState({ x: 0, y: 0, heading: 0, speed: 30 });
    for (let k = 0; k < 100; k += 1) stepCar(CAR, state, { steer: 2, pedal: 0 }, 0.01);
    assert.ok(state.steer <= CHASSIS.steerMax + 1e-12);
  });

  it("is followed by a profile at the front axle's grip, slower in corners than the point mass", () => {
    const car = profileCar(CAR);
    assert.equal(car.muY, 1.85);
    assert.ok(cornerSpeed(car, 0.02) < cornerSpeed(pointMassF1(), 0.02));
  });
});

describe("the pure-pursuit driver", () => {
  const track = createTrack(ring(100, 200, 12));
  const path = pathOf(createLap(track, profileCar(CAR), new Float64Array(track.count)), track);

  it("finds the nearest point from the last one, both ways", () => {
    const at = (i) => [path.x[i] + 0.3, path.y[i]];
    assert.equal(nearestPoint(path, 5, ...at(9)), 9);
    assert.equal(nearestPoint(path, 3, ...at(198)), 198);
  });

  it("doses the pedal from the acceleration, within the grip a corner leaves", () => {
    assert.ok(pedalFor(CAR, 50, 0) > 0);
    assert.ok(pedalFor(CAR, 50, -60) < -1);
    const straight = createCarState({ x: 0, y: 0, heading: 0, speed: 50 });
    assert.equal(gripLeft(CAR, straight), 1);
    assert.equal(gripLeft(CAR, { ...straight, r: 5 }), 0);
    assert.equal(createPursuit(path).index, 0);
  });

  it("drives a lap of a rounded square cleanly, a few per cent over its profile", () => {
    const square = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
    const lap = driveLine(square, minCurvatureLine(square, lineBounds(square)).offsets);
    assert.ok(lap.finished);
    assert.equal(lap.offTime, 0);
    assert.ok(lap.time > lap.profile && lap.time < 1.1 * lap.profile, `${lap.time} s against ${lap.profile} s`);
    assert.ok(lap.deviation < 2);
  });

  it("measures the car across the line and past the edges", () => {
    const i = 10;
    const car = { x: path.x[i] + 3 * track.nx[i], y: path.y[i] + 3 * track.ny[i] };
    assert.ok(Math.abs(sideOf(track, path, i, car) - 3) < 1e-9);
    assert.ok(Math.abs(pastEdge(track, i, car) - (3 - track.wLeft[i])) < 1e-9);
  });
});
