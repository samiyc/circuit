import { TUM_F1, createCar, pointMass, powerAt, resistance } from "../car.js";
import { PL_TYRE, lateralShare } from "./tyre.js";

/**
 * The car that slips (J4, docs/pilote.md § 2): a dynamic bicycle, the two front wheels as one and the two rear wheels
 * as one, with a forward speed u, a sideways speed v and a yaw rate r in the car's frame. Each axle's load is its
 * static share, its downforce and the load transfer of the last acceleration; its lateral force comes from its slip
 * angle through the tyre's curve (./tyre.js), within what its longitudinal force leaves of the friction ellipse. The
 * rear wheels drive, or all four in the file's split (`driveFront`, the rally car); braking takes each axle's grip in proportion (an ideal balance, no locked wheel). The driver
 * sets a steering angle and a pedal, from −1 (full brake) to 1 (full throttle); the car follows them with a lag.
 * The road's grip under the car (the rain, P8: src/profile/surface.js) scales every force the tyres give; whoever steps
 * the car sets it in the state (`roadGrip`, ./run.js), 1 on a dry road.
 * Pure: a state and controls in, the state stepped in place (no allocation, for the searches).
 * @typedef {ReturnType<typeof createBicycle>} Bicycle
 * @typedef {{ x: number, y: number, heading: number, u: number, v: number, r: number, steer: number, pedal: number, ax: number, grip: number }} CarState
 * @typedef {{ steer: number, pedal: number }} Controls
 */

/** What the TUM file lacks; the sources in docs/pilote.md § 2. */
export const CHASSIS = Object.freeze({
  yawInertia: 450, // kg·m², Perantoni and Limebeer 2014, table 2 (their car, 660 kg)
  cogHeight: 0.3, // m, the same table
  steerMax: 0.35, // rad, TUM's racecar.ini (another car): a hypothesis for the F1
  steerLag: 0.05, // s, a hypothesis: TUM's 0.2 s (an autonomous car's actuator) makes every driver weave at speed
  pedalLag: 0.05, // s, TUM's racecar.ini, t_drive and t_brake
});

/** The physics' own step inside a tick, s: 400 Hz keeps the tyres stable down to 5 m/s (docs/pilote.md § 2). */
export const SUBSTEP = 0.0025;

/**
 * @param {import("../car.js").CarFile} [file]
 * @param {Record<keyof typeof CHASSIS, number>} [chassis]
 * @param {typeof PL_TYRE} [tyre]
 */
export function createBicycle(file = TUM_F1, chassis = CHASSIS, tyre = PL_TYRE) {
  return {
    ...chassis,
    tyre,
    point: pointMass(file),
    mass: file.m,
    gravity: file.g,
    lf: file.lf,
    lr: file.lr,
    wheelbase: file.lf + file.lr,
    downFront: 0.5 * file.rhoAir * file.czAFront,
    downRear: 0.5 * file.rhoAir * file.czARear,
    front: { muX: file.muxFront, muY: file.muyFront, dmu: file.dmuDfzFront },
    rear: { muX: file.muxRear, muY: file.muyRear, dmu: file.dmuDfzRear },
    nominalLoad: file.fz0,
    driveFront: file.driveFront,
    /** traction control and ABS (`assisted`): Sami's car only, never the drivers measured */
    assists: false,
    /** @type {import("../types.js").Surface | undefined} the road it drives on, dry without one */
    surface: undefined,
  };
}

/**
 * The point mass whose speed profile this car can follow: the TUM F1's, its lateral grip the front axle's. The front
 * axle carries 45 % of the weight and of the downforce, and takes the same share of the lateral force in a steady
 * corner, so it saturates first, at its own μy (1.85 against 2.15 at the rear, and 2.01 for the point mass's mean).
 * @param {Bicycle} car
 * @returns {import("../types.js").Car}
 */
export function profileCar({ point, front, rear }) {
  return createCar({ ...point, muY: Math.min(front.muY, rear.muY) });
}

/**
 * A car going straight at `speed` along `heading`, its controls at rest.
 * @param {{ x: number, y: number, heading: number, speed: number }} start
 * @returns {CarState}
 */
export function createCarState({ x, y, heading, speed }) {
  return { x, y, heading, u: speed, v: 0, r: 0, steer: 0, pedal: 0, ax: 0, grip: 1 };
}

/** The forces of a substep, reused (the step does not allocate). */
const force = { x: 0, y: 0, yaw: 0 };
const drive = { front: 0, rear: 0 };
/** Each axle's slip angle of the substep, rad, for the assists. */
const slips = { front: 0, rear: 0 };
/** The road's grip under the car in this substep. */
const road = { grip: 1 };

/**
 * An axle's grip as μ·Fz, each μ shifted by the load of one of its two tyres.
 * @param {Bicycle} car
 * @param {{ muX: number, muY: number, dmu: number }} axle
 * @param {number} load N, the axle
 * @param {"muX" | "muY"} direction
 */
function grip(car, axle, load, direction) {
  return road.grip * (axle[direction] + axle.dmu * (load / 2 - car.nominalLoad)) * load;
}

/**
 * An axle's lateral force at a slip angle, within what its longitudinal force leaves of the friction ellipse.
 * @param {Bicycle} car
 * @param {{ muX: number, muY: number, dmu: number }} axle
 * @param {number} load N
 * @param {{ slip: number, longitudinal: number }} tyre
 */
function lateralForce(car, axle, load, { slip, longitudinal }) {
  const used = Math.abs(longitudinal) / grip(car, axle, load, "muX");
  const left = used >= 1 ? 0 : Math.sqrt(1 - used * used);
  return grip(car, axle, load, "muY") * left * lateralShare(car.tyre, slip, load / 2);
}

/**
 * The longitudinal force of each axle from the pedal: the throttle drives the axles in the car's split, within the
 * power and each axle's grip (the rear alone for a rear-wheel drive); the brake takes the same share of both axles'
 * grip. Into `drive`.
 * @param {Bicycle} car
 * @param {CarState} state
 * @param {number} loadFront N
 * @param {number} loadRear N
 */
function longitudinalForces(car, { u, pedal }, loadFront, loadRear) {
  const braking = pedal < 0;
  const front = grip(car, car.front, loadFront, "muX") * assisted(car, slips.front, loadFront);
  const rear = grip(car, car.rear, loadRear, "muX") * assisted(car, slips.rear, loadRear);
  const split = car.driveFront;
  const traction = Math.min(split > 0 ? front / split : Infinity, rear / (1 - split));
  const pushed = pedal * Math.min(powerAt(car.point, u) / u, traction);
  drive.front = braking ? pedal * front : split * pushed;
  drive.rear = braking ? pedal * rear : (1 - split) * pushed;
}

/**
 * The share of an axle's longitudinal grip the assists let the pedal take (traction control and ABS, Sami's car only,
 * docs/pilote.md § 7): what the friction ellipse leaves once the lateral force the axle needs at its slip angle is
 * kept, so that a full key never takes the grip that holds the corner. All of it without the assists.
 * @param {Bicycle} car
 * @param {number} slip rad
 * @param {number} load N, the axle
 */
function assisted(car, slip, load) {
  if (!car.assists) return 1;
  const share = Math.min(1, Math.abs(lateralShare(car.tyre, slip, load / 2)));
  return Math.sqrt(1 - share * share);
}

/**
 * The forces on the car in its frame, and the yaw moment, into `force`.
 * @param {Bicycle} car
 * @param {CarState} state
 */
function computeForces(car, state) {
  const { u, v, r, steer } = state;
  const weight = car.mass * car.gravity;
  const transfer = (car.mass * state.ax * car.cogHeight) / car.wheelbase;
  const loadFront = Math.max(0, (weight * car.lr) / car.wheelbase + car.downFront * u * u - transfer);
  const loadRear = Math.max(0, (weight * car.lf) / car.wheelbase + car.downRear * u * u + transfer);
  road.grip = state.grip;
  slips.front = steer - Math.atan2(v + car.lf * r, u);
  slips.rear = -Math.atan2(v - car.lr * r, u);
  longitudinalForces(car, state, loadFront, loadRear);
  const frontY = lateralForce(car, car.front, loadFront, { slip: slips.front, longitudinal: drive.front });
  const rearY = lateralForce(car, car.rear, loadRear, { slip: slips.rear, longitudinal: drive.rear });
  const [cos, sin] = [Math.cos(steer), Math.sin(steer)];
  const frontSide = drive.front * sin + frontY * cos;
  force.x = drive.front * cos - frontY * sin + drive.rear - Math.sign(u) * resistance(car.point, u);
  force.y = frontSide + rearY;
  force.yaw = car.lf * frontSide - car.lr * rearY;
}

/**
 * The steering and the pedal move towards the driver's, each with its lag; the steering within its lock.
 * @param {Bicycle} car
 * @param {CarState} state
 * @param {Controls} controls
 * @param {number} dt s
 */
function follow(car, state, { steer, pedal }, dt) {
  const wanted = Math.min(car.steerMax, Math.max(-car.steerMax, steer));
  state.steer += (wanted - state.steer) * Math.min(1, dt / car.steerLag);
  state.pedal += (Math.min(1, Math.max(-1, pedal)) - state.pedal) * Math.min(1, dt / car.pedalLag);
}

/**
 * One substep, semi-implicit Euler: the speeds first, then the position with the new speeds.
 * @param {Bicycle} car
 * @param {CarState} state
 * @param {number} dt s
 */
function integrate(car, state, dt) {
  computeForces(car, state);
  state.ax = force.x / car.mass;
  state.u = Math.max(1, state.u + (state.ax + state.v * state.r) * dt);
  state.v += (force.y / car.mass - state.u * state.r) * dt;
  state.r += (force.yaw / car.yawInertia) * dt;
  state.heading += state.r * dt;
  const [cos, sin] = [Math.cos(state.heading), Math.sin(state.heading)];
  state.x += (state.u * cos - state.v * sin) * dt;
  state.y += (state.u * sin + state.v * cos) * dt;
}

/**
 * One tick of `dt` seconds under the driver's controls, in substeps of at most SUBSTEP.
 * @param {Bicycle} car
 * @param {CarState} state stepped in place
 * @param {Controls} controls
 * @param {number} dt s
 */
export function stepCar(car, state, controls, dt) {
  const count = Math.ceil(dt / SUBSTEP - 1e-9);
  for (let k = 0; k < count; k += 1) {
    follow(car, state, controls, dt / count);
    integrate(car, state, dt / count);
  }
}
