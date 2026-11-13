import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointMassF1 } from "../src/car.js";
import { lineBounds, linePoints, TUM_HALF_WIDTH } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { lineGap } from "../scripts/lib/compare.js";
import { readRaceline, readTrack, tracksDownloaded } from "../scripts/lib/tracks.js";

/**
 * The check of P1 (docs/recherche/pistes.md): our minimum-curvature line looks like TU Munich's on one of its tracks,
 * at their margin. Monza, the fastest; skipped until `npm run tracks` has laid the database in data/tum/.
 */
describe("our minimum curvature against TU Munich's, on Monza", { skip: !tracksDownloaded() && "npm run tracks d'abord" }, () => {
  it("runs within a metre and a half of their line on average, and no slower", () => {
    const track = readTrack("Monza");
    const ours = linePoints(track, minCurvatureLine(track, lineBounds(track, TUM_HALF_WIDTH)).offsets);
    const tum = readRaceline("Monza");
    const gap = lineGap(ours, tum);
    assert.ok(gap.mean < 1.5, `mean gap ${gap.mean.toFixed(2)} m`);
    const car = pointMassF1();
    const ourTime = lapTime(car, ours, createProfile(track.count));
    const tumTime = lapTime(car, tum, createProfile(tum.x.length));
    assert.ok(ourTime < tumTime + 0.1, `${ourTime.toFixed(2)} s against ${tumTime.toFixed(2)} s`);
  });
});
