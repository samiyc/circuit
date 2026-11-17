import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointMassF1 } from "../src/car.js";
import { CHASSIS, createBicycle, createCarState, profileCar, stepCar } from "../src/drive/bicycle.js";
import { createPursuit, gripLeft, nearestPoint, pathOf, pedalFor } from "../src/drive/pursuit.js";
import { LATERAL_LIMIT, controlsOf, keyboardInput, lockAt, mergeInputs, padInput } from "../src/drive/input.js";
import { driveLine, pastEdge, sideOf } from "../src/drive/run.js";
import { createSession, lapGap, tickSession } from "../src/drive/session.js";
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

  it("spins on a full throttle out of a corner, unless the assists keep the grip the corner needs", () => {
    const slideAfter = (assists) => {
      const car = { ...CAR, assists };
      const state = createCarState({ x: 0, y: 0, heading: 0, speed: 25 });
      for (let k = 0; k < 100; k += 1) stepCar(car, state, { steer: 0.12, pedal: 0.1 }, 0.01);
      const speed = state.u;
      for (let k = 0; k < 150; k += 1) stepCar(car, state, { steer: 0.12, pedal: 1 }, 0.01);
      return { slip: Math.abs(Math.atan2(state.v, state.u)) / DEGREE, faster: state.u > speed };
    };
    assert.ok(slideAfter(false).slip > 45);
    const held = slideAfter(true);
    assert.ok(held.slip < 10 && held.faster);
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

describe("Sami's hands", () => {
  it("reads the keys he chose: Up, left Ctrl or Down, the arrows", () => {
    assert.deepEqual(keyboardInput(new Set(["ArrowUp", "ArrowLeft"])), { throttle: 1, brake: 0, steer: 1, analog: false });
    assert.equal(keyboardInput(new Set(["ControlLeft"])).brake, 1);
    assert.equal(keyboardInput(new Set(["ArrowLeft", "ArrowRight"])).steer, 0);
  });

  it("reads the gamepad: A, RB or the RT trigger in proportion, the left stick", () => {
    const button = (value) => ({ pressed: value > 0.5, value });
    const buttons = Array.from({ length: 8 }, () => button(0));
    buttons[0] = button(1);
    buttons[7] = button(0.4);
    const pad = padInput({ buttons, axes: [-0.5, 0] });
    assert.deepEqual(pad, { throttle: 1, brake: 0.4, steer: 0.5, analog: true });
    assert.equal(padInput({ buttons, axes: [0.05, 0] }).steer, 0);
    assert.equal(padInput(null), null);
    assert.equal(mergeInputs(keyboardInput(new Set()), pad).brake, 0.4);
  });

  it("doses the throttle on RT and the brake on LT in the racing games' layout", () => {
    const button = (value) => ({ pressed: value > 0.5, value });
    const buttons = Array.from({ length: 8 }, () => button(0));
    buttons[7] = button(0.3);
    buttons[6] = button(0.2);
    const pad = padInput({ buttons, axes: [0, 0] }, "triggers");
    assert.equal(pad.throttle, 0.3);
    assert.equal(pad.brake, 0.2);
    assert.equal(padInput({ buttons, axes: [0, 0] }).throttle, 0);
  });

  it("brings a key's steering to the lock in a quarter of a second, the brake winning over the throttle", () => {
    let share = 0;
    for (let k = 0; k < 10; k += 1) share = controlsOf({ throttle: 1, brake: 0, steer: 1, analog: false }, share, { car: CAR, speed: 10, dt: 0.01 }).share;
    assert.ok(Math.abs(share - 0.4) < 1e-9);
    const controls = controlsOf({ throttle: 1, brake: 0.3, steer: 1, analog: true }, share, { car: CAR, speed: 10, dt: 0.01 });
    assert.equal(controls.pedal, -0.3);
    assert.equal(controls.steer, CAR.steerMax);
  });

  it("shrinks the lock at speed to about 5 g", () => {
    assert.equal(lockAt(CAR, 5), CAR.steerMax);
    assert.ok(Math.abs(lockAt(CAR, 80) - (CAR.wheelbase * LATERAL_LIMIT) / 6400) < 1e-12);
  });
});

describe("a drive on the page", () => {
  const square = createTrack(roundedPolygon({ sides: 4, straight: 200, radius: 30, spacing: 4, width: 14 }));
  const lap = createLap(square, profileCar(CAR), minCurvatureLine(square, lineBounds(square)).offsets);
  const path = pathOf(lap, square);

  it("closes the driver's laps, as a driven lap does", () => {
    const session = createSession({ track: square, path, car: CAR });
    const hands = { throttle: 0, brake: 0, steer: 0, analog: false };
    while (session.robot.laps.length < 2 && session.time < 200) tickSession(session, hands);
    const [first, second] = session.robot.laps;
    assert.ok(first.time > lap.time && first.time < 1.15 * lap.time, `${first.time} s against ${lap.time} s`);
    assert.ok(second.time < first.time + 1);
  });

  it("gives Sami's gap to the ghost at his point", () => {
    const session = createSession({ track: square, path, car: CAR });
    for (let k = 0; k < 300; k += 1) tickSession(session, { throttle: 1, brake: 0, steer: 0, analog: false });
    const { elapsed, gap } = lapGap(session, lap.clock);
    assert.ok(Math.abs(elapsed - 3) < 1e-9);
    assert.equal(gap, elapsed - lap.clock[session.player.index]);
  });

  it("gives Sami's car the assists unless he turns them off, never the driver's", () => {
    const on = createSession({ track: square, path, car: CAR });
    assert.equal(on.playerCar.assists, true);
    assert.equal(on.car.assists, false);
    assert.equal(createSession({ track: square, path, car: CAR, assists: false }).playerCar.assists, false);
  });
});
