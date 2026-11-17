/**
 * The car as a point mass under a friction ellipse (docs/modele.md, § 2): the normal load is the weight plus the
 * downforce, the friction coefficients drop as the tyre load grows, the power is capped at the wheels. The grip each
 * profile step may use comes from here.
 * @typedef {import("./types.js").Car} Car
 * @typedef {Record<keyof typeof TUM_F1, number>} CarFile a TUM car's figures, in the F1's terms
 */

/**
 * The F1 of TU Munich's laptime-simulation, as its file gives it (`laptimesim/input/vehicles/F1_Shanghai.ini`,
 * LGPL-3.0, read on 13/11/2026). Only the figures a point mass uses; the gears, the rpm curve, the torsional mass
 * factors and the energy budget are left out (docs/modele.md, § 2).
 */
export const TUM_F1 = Object.freeze({
  lf: 1.968, // m, front axle to the centre of gravity
  lr: 1.632, // m, rear axle to the centre of gravity
  m: 733.0, // kg, with the driver, without fuel
  fRoll: 0.03,
  cwA: 1.56, // m²
  czAFront: 2.2, // m²
  czARear: 2.68, // m²
  g: 9.81, // m/s²
  rhoAir: 1.18, // kg/m³
  powMax: 575e3, // W, the combustion engine
  etaGearbox: 0.96,
  powEMotor: 120e3, // W, after efficiency losses
  velMinEMotor: 27.777, // m/s
  fz0: 3000.0, // N, nominal tyre load, both axles
  muxFront: 1.65,
  muyFront: 1.85,
  muxRear: 1.95,
  muyRear: 2.15,
  dmuDfzFront: -5.0e-5, // 1/N, both directions
  dmuDfzRear: -5.0e-5,
});

/**
 * The Formula E of the same simulation (`laptimesim/input/vehicles/FE_Berlin.ini`, read on 17/11/2026), in the F1's
 * terms: its electric motor is its only power (200 kW after the motor's losses, through the same gearbox efficiency
 * as the F1's engine), without a boost. Left out as for the F1: the two gears, the motor's torque cap (150 Nm, about
 * the rear tyres' grip in first gear), the energy budget (docs/voitures.md, § 1).
 */
export const TUM_FE = Object.freeze({
  lf: 1.906,
  lr: 1.194,
  m: 880.0, // kg, the minimum of the rules
  fRoll: 0.02,
  cwA: 1.15,
  czAFront: 1.24,
  czARear: 1.52,
  g: 9.81,
  rhoAir: 1.18,
  powMax: 200e3, // W, the electric motor
  etaGearbox: 0.96,
  powEMotor: 0,
  velMinEMotor: Infinity,
  fz0: 2500.0,
  muxFront: 1.22,
  muyFront: 1.22,
  muxRear: 1.42,
  muyRear: 1.42,
  dmuDfzFront: -2.5e-5,
  dmuDfzRear: -2.0e-5,
});

/** An axle figure for the point mass, weighted by the static load shares (the same on both axles: as it is). */
function weighted(front, rear, rearShare) {
  return front === rear ? front : (1 - rearShare) * front + rearShare * rear;
}

/**
 * The point mass of a TUM car (the F1 by default): each axle's μ weighted by its static share of the load (the downforce splits about the
 * same way, 45 % in front), the traction on the rear axle alone (it is rear-wheel drive). A hypothesis of
 * docs/modele.md, § 2, not a figure of the source.
 * @param {CarFile} [file]
 * @returns {Car}
 */
export function pointMass(file = TUM_F1) {
  const rearShare = file.lf / (file.lf + file.lr);
  const frontShare = 1 - rearShare;
  return createCar({
    mass: file.m,
    gravity: file.g,
    muX: frontShare * file.muxFront + rearShare * file.muxRear,
    muY: frontShare * file.muyFront + rearShare * file.muyRear,
    driveMu: rearShare * file.muxRear,
    loadSensitivity: weighted(file.dmuDfzFront, file.dmuDfzRear, rearShare),
    nominalLoad: file.fz0,
    downforce: 0.5 * file.rhoAir * (file.czAFront + file.czARear),
    drag: 0.5 * file.rhoAir * file.cwA,
    rolling: file.fRoll,
    power: file.etaGearbox * file.powMax,
    boostPower: file.powEMotor,
    boostSpeed: file.velMinEMotor,
  });
}

/** The point mass of the TUM F1, the car of every measure before the Formula E. */
export const pointMassF1 = () => pointMass(TUM_F1);

/**
 * A car from its figures, with its top speed derived. Omitted terms are zero (a car without air, without rolling
 * resistance, with unbounded power: the textbook point mass of the tests).
 * @param {Partial<Car> & { mass: number, gravity: number, muX: number, muY: number }} figures
 * @returns {Car}
 */
export function createCar(figures) {
  const car = {
    driveMu: figures.muX,
    loadSensitivity: 0,
    nominalLoad: 0,
    downforce: 0,
    drag: 0,
    rolling: 0,
    power: Infinity,
    boostPower: 0,
    boostSpeed: Infinity,
    topSpeed: Infinity,
    ...figures,
  };
  if (car.loadSensitivity > 0) throw new Error("the grip drops as the load grows: loadSensitivity ≤ 0");
  car.topSpeed = topSpeed(car);
  return car;
}

/** @param {Car} car @param {number} speed @returns {number} N */
export function normalLoad(car, speed) {
  return car.mass * car.gravity + car.downforce * speed * speed;
}

/** The shift of every μ at this normal load, the four tyres equally loaded. @param {Car} car @param {number} load */
export function gripShift(car, load) {
  return car.loadSensitivity * (load / 4 - car.nominalLoad);
}

/** @param {Car} car @param {number} speed @returns {number} W */
export function powerAt(car, speed) {
  return speed >= car.boostSpeed ? car.power + car.boostPower : car.power;
}

/**
 * The resistance on a straight, the drag and the rolling.
 * @param {Car} car @param {number} speed @returns {number} N
 */
export function resistance(car, speed) {
  return car.drag * speed * speed + car.rolling * normalLoad(car, speed);
}

/**
 * The speed where the drive force meets the resistance, by bisection: the drive grows less than the drag, so the
 * net force crosses zero once. Infinite for a car without air and without a power cap.
 * @param {Car} car
 * @returns {number} m/s
 */
function topSpeed(car) {
  const net = (speed) => {
    const load = normalLoad(car, speed);
    const traction = (car.driveMu + gripShift(car, load)) * load;
    return Math.min(traction, powerAt(car, speed) / speed) - resistance(car, speed);
  };
  if (net(1000) > 0) return Infinity;
  let low = 1;
  let high = 1000;
  for (let i = 0; i < 60; i += 1) {
    const middle = (low + high) / 2;
    if (net(middle) > 0) low = middle;
    else high = middle;
  }
  return low;
}
