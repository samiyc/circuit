import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointMassF1 } from "../src/car.js";
import { bicycleOf, carOf, linesDir, pointMassOf } from "../src/cars.js";
import { createBicycle, createCarState, stepCar } from "../src/drive/bicycle.js";
import { driveLine } from "../src/drive/run.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { roundedPolygon, stadium } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";

const KMH = 3.6;

describe("the cars", () => {
  it("keeps the F1 as it was, by its key", () => {
    assert.deepEqual(pointMassOf("f1"), pointMassF1());
    assert.deepEqual(bicycleOf("f1"), createBicycle());
    assert.equal(linesDir("data/lines", "f1"), "data/lines");
    assert.equal(linesDir("data/lines-bicycle", "fe"), "data/lines-bicycle-fe");
    assert.throws(() => carOf("trackmania"), /voiture inconnue/);
  });

  it("makes the Formula E slower than the F1: less power, less downforce, less grip", () => {
    const [f1, fe] = [pointMassOf("f1"), pointMassOf("fe")];
    assert.ok(fe.topSpeed * KMH > 200 && fe.topSpeed * KMH < 260, `${fe.topSpeed * KMH} km/h`);
    assert.ok(fe.topSpeed < f1.topSpeed && fe.downforce < f1.downforce && fe.muY < f1.muY);
    assert.ok(fe.loadSensitivity > -2.5e-5 && fe.loadSensitivity < -2e-5, "each axle's dμ/dFz weighted by its share");
    const track = createTrack(stadium({ straight: 600, radius: 60, spacing: 4, width: 14 }));
    const points = linePoints(track, minCurvatureLine(track, lineBounds(track)).offsets);
    const time = (car) => lapTime(car, points, createProfile(track.count));
    assert.ok(time(fe) > 1.1 * time(f1), `${time(fe)} s against ${time(f1)} s`);
  });

  for (const [key, over] of [["fe", 1.25], ["rally", 1.7]]) {
    it(`drives the ${key} bicycle round a lap cleanly under its rule, within ${over} of its profile`, () => {
      const square = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
      const settings = carOf(key).rule;
      const lap = driveLine(square, minCurvatureLine(square, lineBounds(square)).offsets, { car: bicycleOf(key), settings });
      assert.ok(lap.finished);
      assert.equal(lap.offTime, 0);
      assert.ok(lap.time > lap.profile && lap.time < over * lap.profile, `${lap.time} s against ${lap.profile} s`);
    });
  }

  it("drives the rally car's four wheels: half the drive in front, the traction of the axle that slips first", () => {
    const rally = pointMassOf("rally");
    assert.ok(Math.abs(rally.driveMu - 0.4) < 1e-3, "the rear's 40 % of the load carries half the drive");
    assert.ok(rally.driveMu > 0.4 * 0.5 - 1e-9 && rally.driveMu < rally.muX);
    const launch = (car) => {
      const state = createCarState({ x: 0, y: 0, heading: 0, speed: 5 });
      stepCar(car, state, { steer: 0, pedal: 1 }, 1);
      return state.u;
    };
    const rearOnly = bicycleOf("rally");
    rearOnly.driveFront = 0;
    assert.ok(launch(bicycleOf("rally")) > launch(rearOnly) + 1, "four driven wheels launch faster on gravel");
  });
});
