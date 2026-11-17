import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointMassF1 } from "../src/car.js";
import { lineBounds } from "../src/line/line.js";
import { minCurvatureLine } from "../src/line/references.js";
import { roundedPolygon } from "../src/track/shapes.js";
import { createTrack } from "../src/track/track.js";
import { BOARD_DISTANCES, brakingBoards, brakingPoints } from "../src/view/boards.js";
import { CHASE, chaseScreen, toChase } from "../src/view/chase.js";
import { createLap } from "../src/view/lap.js";

describe("the braking boards", () => {
  it("finds a braking point at a top followed by a real drop, a lift is not one, across the start too", () => {
    assert.deepEqual(brakingPoints(Float64Array.from([50, 60, 70, 40, 30, 30, 60, 70, 68, 72])), [2, 9]);
  });

  it("stands each board its distance before its corner, on the side the line is not on", () => {
    const track = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
    const lap = createLap(track, pointMassF1(), minCurvatureLine(track, lineBounds(track)).offsets);
    const boards = brakingBoards(track, lap);
    const points = brakingPoints(lap.profile.speed);
    assert.equal(points.length, 4);
    assert.equal(boards.length, 4 * BOARD_DISTANCES.length);
    const n = track.count;
    for (const [k, board] of boards.entries()) {
      const point = points[Math.floor(k / BOARD_DISTANCES.length)];
      let walked = 0;
      for (let i = board.index; i !== point; i = (i + 1) % n) walked += lap.profile.step[i];
      assert.ok(walked >= board.distance && walked < board.distance + 5, `${walked} m for ${board.distance} m`);
      const offset = (lap.x[board.index] - track.x[board.index]) * track.nx[board.index] + (lap.y[board.index] - track.y[board.index]) * track.ny[board.index];
      assert.ok(offset * board.side <= 0);
    }
  });
});

describe("the view from behind", () => {
  it("sees a point ahead of the car in front, one to its left on the left, whatever the heading", () => {
    const ahead = toChase({ x: 0, y: 0, heading: Math.PI / 2 }, 0, 11);
    assert.ok(Math.abs(ahead.depth - (CHASE.back + 11)) < 1e-9 && Math.abs(ahead.left) < 1e-9);
    const left = toChase({ x: 0, y: 0, heading: Math.PI / 2 }, -1, 0);
    assert.ok(Math.abs(left.depth - CHASE.back) < 1e-9 && Math.abs(left.left - 1) < 1e-9);
  });

  it("draws the road below the horizon, nearer lower and larger, left on the left, nothing behind the lens", () => {
    const [width, height] = [1000, 600];
    const near = chaseScreen({ depth: 10, left: 0 }, width, height);
    const far = chaseScreen({ depth: 100, left: 0 }, width, height);
    assert.equal(near.x, width / 2);
    assert.ok(near.y > far.y && far.y > CHASE.horizon * height && near.scale > far.scale);
    assert.ok(chaseScreen({ depth: 10, left: 2 }, width, height).x < width / 2);
    assert.equal(chaseScreen({ depth: CHASE.near / 2, left: 0 }, width, height), null);
  });
});
