import { TUM_F1, TUM_FE, pointMass } from "./car.js";
import { CHASSIS, createBicycle } from "./drive/bicycle.js";
import { TUNED } from "./drive/pursuit.js";

/**
 * The cars the measures and the pages know (docs/voitures.md), by key: each one's figures, the chassis of its
 * bicycle, and the rule its driver follows (P7's settings, tuned per car). The F1 is the car of every measure before;
 * its lines keep their folders, another car's add its key (data/lines-fe/, data/lines-bicycle-fe/).
 * @typedef {keyof typeof CARS} CarKey
 */

/**
 * The Formula E's chassis (docs/voitures.md, § 1): the height of its centre of gravity from its TUM file (h_cog), its
 * yaw inertia the F1's scaled by m·L² (880 kg on 3.10 m against 733 kg on 3.60 m: 450 → 400 kg·m², a hypothesis), the
 * steering and the pedals the F1's.
 */
export const FE_CHASSIS = Object.freeze({ ...CHASSIS, yawInertia: 400, cogHeight: 0.345 });

/**
 * A Rally2 on gravel (docs/voitures.md, § 5), in the TUM files' terms: Škoda's Fabia RS Rally2 for the figures its
 * maker and the rules give, hypotheses for the rest. Its μ is the loose surface's, 0.5 (Velenis, Tsiotras and Lu,
 * SAE 2008, from the abstract): every track is gravel.
 */
export const RALLY2 = Object.freeze({
  lf: 1.025, // m, a hypothesis: 60 % of the weight in front (a transverse engine), on Škoda's 2.563 m wheelbase
  lr: 1.538,
  m: 1230, // kg, the FIA's minimum
  fRoll: 0.03, // a hypothesis: the F1's
  cwA: 0.8, // m², a hypothesis: Cd 0.4 on about 2 m² (1.82 m wide)
  czAFront: 0, // m², a hypothesis: no downforce worth the name at a rally's speeds
  czARear: 0,
  g: 9.81,
  rhoAir: 1.18,
  powMax: 214e3, // W, Škoda (289 hp, through the 32 mm restrictor)
  etaGearbox: 0.96, // a hypothesis: the F1's
  powEMotor: 0,
  velMinEMotor: Infinity,
  fz0: 3000, // N, about the static load of a tyre
  muxFront: 0.5,
  muyFront: 0.5,
  muxRear: 0.5,
  muyRear: 0.5,
  dmuDfzFront: 0, // a hypothesis: no figure for a loose surface
  dmuDfzRear: 0,
  driveFront: 0.5, // a hypothesis (Sami, 17/11): no centre differential (the rules forbid it), half the drive in front
});

/**
 * The Rally2's chassis: its yaw inertia m·lf·lr (a road car's dynamic index of 1, a hypothesis: 1 940 kg·m²), its
 * centre of gravity at 0.45 m (a hypothesis), the steering and the pedals the F1's.
 */
export const RALLY2_CHASSIS = Object.freeze({ ...CHASSIS, yawInertia: 1940, cogHeight: 0.45 });

/**
 * P7 for each car (docs/voitures.md): CMA-ES on its bicycle lines of even rank, seed 1, rounded. The Formula E's with
 * the margin from 0.7 (`marginLow=0.7`): 50 laps of 50, 18 % over the profile; the Rally2's from 0.6: 21 of 50, 53 %.
 */
export const TUNED_FE = Object.freeze({ lookTime: 0.1, lookMin: 6.6, margin: 0.86, gain: 0.15, anticipation: 0.8, crossGain: 0 });
export const TUNED_RALLY = Object.freeze({ lookTime: 0.54, lookMin: 20, margin: 0.65, gain: 0.5, anticipation: 0.29, crossGain: 0 });

export const CARS = Object.freeze({
  f1: { name: "F1", file: TUM_F1, chassis: CHASSIS, rule: TUNED },
  fe: { name: "Formule E", file: TUM_FE, chassis: FE_CHASSIS, rule: TUNED_FE },
  rally: { name: "Rally2 sur la terre", file: RALLY2, chassis: RALLY2_CHASSIS, rule: TUNED_RALLY },
});

/** @param {string} key @returns {(typeof CARS)[CarKey]} */
export function carOf(key) {
  if (!Object.hasOwn(CARS, key)) throw new Error(`voiture inconnue : ${key} (${Object.keys(CARS).join(", ")})`);
  return CARS[/** @type {CarKey} */ (key)];
}

/** The point mass of a car. @param {string} key */
export const pointMassOf = (key) => pointMass(carOf(key).file);

/** The bicycle of a car. @param {string} key */
export function bicycleOf(key) {
  const { file, chassis } = carOf(key);
  return createBicycle(file, chassis);
}

/** A lines' folder for a car: the F1's keeps its name. @param {string} base @param {string} key */
export const linesDir = (base, key) => (key === "f1" ? base : `${base}-${key}`);
