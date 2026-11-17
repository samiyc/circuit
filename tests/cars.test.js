import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointMassF1 } from "../src/car.js";
import { bicycleOf, carOf, linesDir, pointMassOf } from "../src/cars.js";
import { createBicycle } from "../src/drive/bicycle.js";
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

  it("drives the Formula E's bicycle round a lap cleanly, a few per cent over its profile", () => {
    const square = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
    const lap = driveLine(square, minCurvatureLine(square, lineBounds(square)).offsets, { car: bicycleOf("fe") });
    assert.ok(lap.finished);
    assert.equal(lap.offTime, 0);
    assert.ok(lap.time > lap.profile && lap.time < 1.1 * lap.profile, `${lap.time} s against ${lap.profile} s`);
  });
});
