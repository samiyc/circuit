import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { pointMassF1 } from "../src/car.js";
import { linePoints } from "../src/line/line.js";
import { referenceLines } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { driveLine } from "../src/drive/run.js";
import { ring, roundedPolygon, stadium } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";

/**
 * What the model does, held in a hash (as in raquette and the other clients): a refactor must leave it unchanged. A
 * change meant to alter what the model does updates it here, and its commit says so, with the measures before and
 * after (`npm run references`).
 */
const EXPECTED = {
  // 14/11/2026: the speed profile of the TUM F1 as a point mass (docs/modele.md, §§ 2-3).
  profile: "ae3356edb428b16a",
  // 14/11/2026: the three reference lines, the minimum curvature as the bending energy ∫κ²·ds (docs/modele.md, § 4).
  references: "8a46e0f189c536b5",
  // 15/11/2026: the car that slips, driven by the pure-pursuit driver (docs/pilote.md, §§ 2-4).
  drive: "0a4f08f1c3e70fe8",
};

const F1 = pointMassF1();
const TRACKS = [
  ring(80, 360, 12),
  stadium({ straight: 800, radius: 15, spacing: 5, width: 12 }),
  stadium({ straight: 1500, radius: 400, spacing: 5, width: 12 }),
  roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }),
  roundedPolygon({ sides: 5, straight: 120, radius: 60, spacing: 5, width: 10 }),
];

const digest = (hash) => hash.digest("hex").slice(0, 16);

/** Every speed of every profile, and the lap times, to the bit. */
function profileHash() {
  const hash = createHash("sha256");
  for (const track of TRACKS) {
    const profile = createProfile(track.x.length);
    hash.update(new Float64Array([lapTime(F1, track, profile)]));
    hash.update(profile.speed);
  }
  return digest(hash);
}

/** The offsets of the three references on the hand-drawn tracks, and their lap times. */
function referencesHash() {
  const hash = createHash("sha256");
  for (const raw of TRACKS.slice(3)) {
    const track = createTrack(raw);
    const lines = referenceLines(track);
    for (const offsets of [lines.centre, lines.shortest, lines.minCurvature]) {
      hash.update(offsets);
      hash.update(new Float64Array([lapTime(F1, linePoints(track, offsets), createProfile(track.count))]));
    }
  }
  return digest(hash);
}

/** A lap of the car that slips on the minimum-curvature line of the hand-drawn tracks: its time, its time off, its
 * distance to the line. */
function driveHash() {
  const hash = createHash("sha256");
  for (const raw of TRACKS.slice(3)) {
    const track = createTrack(raw);
    const lap = driveLine(track, referenceLines(track).minCurvature);
    hash.update(new Float64Array([lap.profile, lap.time, lap.offTime, lap.deviation, Number(lap.finished)]));
  }
  return digest(hash);
}

describe("the fingerprints of the model", () => {
  it("the speed profile", () => assert.equal(profileHash(), EXPECTED.profile));
  it("the reference lines", () => assert.equal(referencesHash(), EXPECTED.references));
  it("the car that slips and its driver", () => assert.equal(driveHash(), EXPECTED.drive));
});
