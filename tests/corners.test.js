import { describe, it } from "node:test";
import { BEFORE, PHASES, wetShifts } from "../src/analysis/wet.js";
import assert from "node:assert/strict";
import { along, apexOf, apexShifts, findCorners } from "../src/analysis/corners.js";

describe("the corners of a line", () => {
  it("are the runs bending the same way past the threshold, across the end of the loop too", () => {
    const k = Float64Array.of(0.01, 0.01, 0, 0, 0.02, 0.02, 0.02, 0, -0.01, -0.01, -0.01, 0, 0.01);
    assert.deepEqual(findCorners(k, { threshold: 0.005, minimum: 3 }), [
      { from: 4, to: 6, sign: 1 },
      { from: 8, to: 10, sign: -1 },
      { from: 12, to: 1, sign: 1 },
    ]);
    assert.deepEqual(findCorners(new Float64Array(5).fill(0.1)), []);
  });

  it("measure the distance along the loop", () => {
    assert.deepEqual([...along(Float64Array.of(1, 2, 3))], [0, 1, 3]);
  });
});

describe("the apex", () => {
  const n = 40;
  const bounds = { lower: new Float64Array(n).fill(-5), upper: new Float64Array(n).fill(5) };
  const corner = { from: 15, to: 25, sign: 1 };
  const touching = (from, to) => Float64Array.from({ length: n }, (_, i) => (i >= from && i <= to ? 5 : 0));

  it("is the middle of the stretch nearest the inside edge (the left one, turning left)", () => {
    assert.equal(apexOf(corner, touching(18, 22), bounds, { pad: 3 }), 20);
    assert.equal(apexOf({ ...corner, sign: -1 }, touching(18, 22).map((o) => -o), bounds, { pad: 3 }), 20);
  });

  it("shifts later when the other line touches later, and gains the exit speed it has", () => {
    const distance = Float64Array.from({ length: n }, (_, i) => 5 * i);
    const speeds = { reference: new Float64Array(n).fill(30), line: new Float64Array(n).fill(30) };
    speeds.line[25] = 33;
    const [shift] = apexShifts([corner, { from: 32, to: 34, sign: -1 }], { reference: touching(18, 22), line: touching(21, 25), bounds, distance, length: 5 * n, speeds });
    assert.equal(shift.shift, 15);
    assert.equal(shift.exitGain, 3);
    assert.equal(shift.straightAfter, 35);
  });
});

describe("the wet line against the dry one", () => {
  it("measures the shift to the outside and the share of the band's drop suffered, in each phase of a corner", () => {
    const n = 100;
    const step = new Float64Array(n).fill(10);
    const dry = new Float64Array(n);
    // A left corner from 40 to 48: the wet line 2 m to the right (outside) before it and at its entry, on the dry line
    // in its middle, 0.5 m to the left (inside) after.
    const wet = new Float64Array(n);
    wet.fill(-2, 34, 43);
    wet.fill(0.5, 49, 55);
    const shifts = wetShifts([{ from: 40, to: 48, sign: 1 }], { dry, wet, step, half: 1.5 });
    assert.deepEqual(Object.keys(shifts), [...PHASES]);
    assert.deepEqual(shifts.avant, { outward: 2, felt: 0, points: BEFORE / 10 });
    assert.deepEqual(shifts["entrée"], { outward: 2, felt: 0, points: 3 });
    assert.deepEqual(shifts.milieu, { outward: 0, felt: 1, points: 3 });
    assert.equal(shifts["après"].outward, -0.5);
    assert.ok(Math.abs(shifts["après"].felt - (1 - 0.25 / 2.25) ** 2) < 1e-12);
  });
});
