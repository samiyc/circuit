import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closedLength, curvatureAt, measureLine } from "../src/geometry.js";
import { createTrack, decimate, parseRaceline, parseTrack } from "../src/track/track.js";
import { ring, stadium } from "../src/track/shapes.js";

const CSV = "# x_m,y_m,w_tr_right_m,w_tr_left_m\r\n0,0,5,6\n10,0,5,6\n\n10,10,4,7\n0,10,5,6\n";

describe("the TUM track format", () => {
  it("reads the centre line and the widths, comments and blank lines skipped", () => {
    const track = parseTrack(CSV);
    assert.deepEqual([...track.x], [0, 10, 10, 0]);
    assert.deepEqual([...track.wRight], [5, 5, 4, 5]);
    assert.deepEqual([...track.wLeft], [6, 6, 7, 6]);
  });

  it("refuses a row that is not four numbers", () => {
    assert.throws(() => parseTrack("1,2,3\n"));
    assert.throws(() => parseTrack("1,2,3,x\n"));
  });

  it("reads a race line's points", () => {
    const line = parseRaceline("# x_m,y_m\n1,2\n3,4\n");
    assert.deepEqual([...line.x], [1, 3]);
    assert.deepEqual([...line.y], [2, 4]);
  });

  it("keeps every n-th point", () => {
    assert.deepEqual([...decimate(parseTrack(CSV), 2).y], [0, 10]);
  });
});

describe("the track's normals", () => {
  it("are unit vectors pointing left, into the bends of an anticlockwise ring", () => {
    const track = createTrack(ring(50, 64, 10));
    for (let i = 0; i < track.count; i += 1) {
      assert.ok(Math.abs(Math.hypot(track.nx[i], track.ny[i]) - 1) < 1e-12);
      assert.ok(Math.abs(track.nx[i] + track.x[i] / 50) < 1e-12 && Math.abs(track.ny[i] + track.y[i] / 50) < 1e-12);
    }
  });

  it("need three points", () => {
    assert.throws(() => createTrack(decimate(parseTrack(CSV), 2)));
  });
});

describe("the geometry of a line", () => {
  it("gives 1/R on a circle, positive to the left, 0 on a straight or a repeated point", () => {
    const middle = (angles) =>
      curvatureAt(Float64Array.from(angles, (a) => 30 * Math.cos(a)), Float64Array.from(angles, (a) => 30 * Math.sin(a)), 1);
    assert.ok(Math.abs(middle([0, 0.3, 0.5]) - 1 / 30) < 1e-12);
    assert.ok(Math.abs(middle([0.5, 0.3, 0]) + 1 / 30) < 1e-12);
    assert.equal(curvatureAt(Float64Array.of(0, 1, 2), Float64Array.of(0, 1, 2), 1), 0);
    assert.equal(curvatureAt(Float64Array.of(0, 0, 2), Float64Array.of(0, 0, 2), 1), 0);
  });

  it("closes a loop, and leaves an open line straight at its ends with no last step", () => {
    const { x, y } = ring(20, 40, 8);
    const out = { step: new Float64Array(40), curvature: new Float64Array(40) };
    measureLine(x, y, true, out);
    assert.ok(out.curvature.every((k) => Math.abs(k - 1 / 20) < 1e-12));
    assert.ok(Math.abs(out.step.reduce((a, b) => a + b) - closedLength(x, y)) < 1e-9);
    measureLine(x, y, false, out);
    assert.equal(out.step[39], 0);
    assert.equal(out.curvature[0], 0);
    assert.equal(out.curvature[39], 0);
  });

  it("draws a stadium of the asked length, anticlockwise", () => {
    const { x, y } = stadium({ straight: 300, radius: 50, spacing: 5, width: 10 });
    assert.ok(Math.abs(closedLength(x, y) - (600 + 2 * Math.PI * 50)) < 1);
    const out = { step: new Float64Array(x.length), curvature: new Float64Array(x.length) };
    measureLine(x, y, true, out);
    assert.ok(out.curvature.every((k) => k >= -1e-12));
  });
});
