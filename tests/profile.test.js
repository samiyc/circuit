import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCar, normalLoad, gripShift, pointMassF1, resistance, powerAt } from "../src/car.js";
import { brakeDeceleration, cornerSpeed, driveAcceleration } from "../src/profile/grip.js";
import { createProfile, lapTime, pathTime } from "../src/profile/profile.js";
import { BAND, WET, fillGrip, onSurface } from "../src/profile/surface.js";
import { ring, stadium } from "../src/track/shapes.js";

/** The textbook point mass: μ = 1.2 both ways, no air, no rolling, unbounded power. */
const TEXTBOOK = createCar({ mass: 700, gravity: 9.81, muX: 1.2, muY: 1.2 });
const F1 = pointMassF1();

const profiled = (car, { x, y }) => {
  const profile = createProfile(x.length);
  return { time: lapTime(car, { x, y }, profile), profile };
};

/** Every step of the profile within the ellipse: v ≤ the corner speed, a ≤ the drive, −a ≤ the braking. */
function assertWithinGrip(car, { count, step, curvature, limit, speed }) {
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    assert.ok(speed[i] <= limit[i] * (1 + 1e-12), `point ${i}: ${speed[i]} above ${limit[i]}`);
    const lateral = car.mass * speed[i] ** 2 * Math.abs(curvature[i]);
    const load = normalLoad(car, speed[i]);
    assert.ok(lateral <= (car.muY + gripShift(car, load)) * load * (1 + 1e-9), `point ${i}: lateral grip exceeded`);
    const acceleration = (speed[next] ** 2 - speed[i] ** 2) / (2 * step[i]);
    if (acceleration >= 0) {
      assert.ok(acceleration <= driveAcceleration(car, speed[i], curvature[i]) + 1e-9, `step ${i}: drives too hard`);
    } else {
      assert.ok(-acceleration <= brakeDeceleration(car, speed[next], curvature[next]) + 1e-9, `step ${i}: brakes too hard`);
    }
  }
}

describe("the cornering speed", () => {
  it("is √(μ·g/|κ|) without air, either sign", () => {
    assert.ok(Math.abs(cornerSpeed(TEXTBOOK, 1 / 50) - Math.sqrt(1.2 * 9.81 * 50)) < 1e-9);
    assert.equal(cornerSpeed(TEXTBOOK, -1 / 50), cornerSpeed(TEXTBOOK, 1 / 50));
    assert.equal(cornerSpeed(TEXTBOOK, 0), Infinity);
  });

  it("is √(μ·g / (κ − μ·k)) with downforce and no load sensitivity, unbounded below κ = μ·k", () => {
    const car = createCar({ mass: 733, gravity: 9.81, muX: 1.8, muY: 2, downforce: 2.88 });
    const k = car.downforce / car.mass;
    assert.ok(Math.abs(cornerSpeed(car, 1 / 60) - Math.sqrt((2 * 9.81) / (1 / 60 - 2 * k))) < 1e-9);
    assert.equal(cornerSpeed(car, 0.9 * 2 * k), Infinity);
  });

  it("takes all the lateral grip with the TUM F1, its load sensitivity included", () => {
    for (const radius of [12, 40, 70, 100]) {
      const speed = cornerSpeed(F1, 1 / radius);
      assert.ok(speed < F1.topSpeed, `R = ${radius} m is below the top speed`);
      const load = normalLoad(F1, speed);
      const lateral = (F1.mass * speed * speed) / radius;
      const grip = (F1.muY + gripShift(F1, load)) * load;
      assert.ok(Math.abs(lateral / grip - 1) < 1e-9, `R = ${radius} m: ${lateral} against ${grip}`);
    }
  });
});

describe("the TUM F1 as a point mass", () => {
  it("weighs each axle's μ by its static load and drives the rear", () => {
    assert.ok(Math.abs(F1.muX - 1.814) < 1e-3 && Math.abs(F1.muY - 2.014) < 1e-3 && Math.abs(F1.driveMu - 1.066) < 1e-3);
  });

  it("tops out where the power meets the drag and the rolling, about 312 km/h", () => {
    const net = powerAt(F1, F1.topSpeed) / F1.topSpeed - resistance(F1, F1.topSpeed);
    assert.ok(Math.abs(net) < 1e-6, `net force ${net} N`);
    assert.ok(F1.topSpeed > 86 && F1.topSpeed < 87.2, `${F1.topSpeed} m/s`);
  });

  it("refuses a grip that grows with the load", () => {
    assert.throws(() => createCar({ mass: 1, gravity: 9.81, muX: 1, muY: 1, loadSensitivity: 1e-5 }));
  });
});

describe("the speed profile", () => {
  it("is constant at √(μ·g·R) on a ring, and the lap is its length over that speed", () => {
    const radius = 80;
    const { time, profile } = profiled(TEXTBOOK, ring(radius, 360, 12));
    const expected = Math.sqrt(1.2 * 9.81 * radius);
    for (const speed of profile.speed) assert.ok(Math.abs(speed - expected) < 1e-9);
    const perimeter = 360 * 2 * radius * Math.sin(Math.PI / 360);
    assert.ok(Math.abs(time - perimeter / expected) < 1e-9);
  });

  it("follows the exact kinematics on a straight: t = (√(v0² + 2aL) − v0) / a", () => {
    const length = 400;
    const x = Float64Array.from({ length: 201 }, (_, i) => (length * i) / 200);
    const y = new Float64Array(201);
    const a = 1.2 * 9.81;
    for (const entry of [0, 20]) {
      const time = pathTime(TEXTBOOK, { x, y }, createProfile(201), entry);
      const expected = (Math.sqrt(entry * entry + 2 * a * length) - entry) / a;
      assert.ok(Math.abs(time - expected) < 1e-9, `entering at ${entry} m/s: ${time} against ${expected}`);
    }
  });

  it("never asks more than the ellipse gives, on a stadium of hairpins with the TUM F1", () => {
    const { profile } = profiled(F1, stadium({ straight: 800, radius: 15, spacing: 5, width: 12 }));
    assertWithinGrip(F1, profile);
    assert.ok(Math.max(...profile.speed) > 70, "the straights are long enough to get going");
  });

  it("never brakes for a bend open enough: flat out where the corner allows more than the car reaches", () => {
    const { profile } = profiled(F1, stadium({ straight: 1500, radius: 400, spacing: 5, width: 12 }));
    assertWithinGrip(F1, profile);
    for (let i = 0; i < profile.count; i += 1) {
      const next = (i + 1) % profile.count;
      assert.ok(profile.speed[next] >= profile.speed[i] - 1e-6, `slows down at ${i}`);
    }
    assert.ok(Math.abs(profile.speed[0] - F1.topSpeed) < 1e-6);
  });

  it("brakes hard for a tight one", () => {
    const { profile } = profiled(F1, stadium({ straight: 1500, radius: 15, spacing: 5, width: 12 }));
    let hardest = 0;
    for (let i = 0; i < profile.count; i += 1) {
      const next = (i + 1) % profile.count;
      hardest = Math.max(hardest, (profile.speed[i] ** 2 - profile.speed[next] ** 2) / (2 * profile.step[i]));
    }
    assert.ok(hardest > 3 * 9.81, `${(hardest / 9.81).toFixed(1)} g at most`);
  });

  it("replays: the same line gives the same time to the bit", () => {
    const track = stadium({ straight: 600, radius: 30, spacing: 4, width: 12 });
    assert.equal(profiled(F1, track).time, profiled(F1, track).time);
  });
});

describe("the wet road", () => {
  it("scales the corner speed by the root of the grip on a car without air, and leaves a dry car as it was", () => {
    assert.ok(Math.abs(cornerSpeed(TEXTBOOK, 1 / 50, 0.81) - 0.9 * cornerSpeed(TEXTBOOK, 1 / 50)) < 1e-9);
    const line = ring(100, 126, 14);
    const profile = createProfile(line.x.length);
    const dry = lapTime(F1, line, profile);
    assert.ok(lapTime(onSurface(F1, { wet: WET }), line, profile) > 1.05 * dry);
    assert.equal(lapTime(F1, line, profile), dry);
    assert.ok(profile.grip.every((grip) => grip === 1));
  });

  it("loses the band's grip on the dry line, smoothly to none half a band away", () => {
    const line = ring(100, 126, 14);
    const near = (offset) => ({ x: line.x.map((x) => x * (1 + offset / 100)), y: line.y.map((y) => y * (1 + offset / 100)) });
    const surface = { wet: WET, line, ...BAND };
    const grip = new Float64Array(line.x.length);
    const at = (offset) => (fillGrip(surface, near(offset), grip), grip[0]);
    assert.ok(Math.abs(at(0) - WET * (1 - BAND.drop)) < 1e-12);
    assert.ok(at(0) < at(0.5) && at(0.5) < at(1) && at(1) < WET);
    assert.equal(at(BAND.half), WET);
    assert.equal(at(-3), WET);
    const profile = createProfile(line.x.length);
    assert.ok(lapTime(onSurface(F1, surface), line, profile) > lapTime(onSurface(F1, surface), near(2), profile));
  });
});
