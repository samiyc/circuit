import { TUM_F1, TUM_FE, pointMass } from "./car.js";
import { CHASSIS, FE_CHASSIS, createBicycle } from "./drive/bicycle.js";

/**
 * The cars the measures and the pages know (docs/voitures.md), by key: each one's TUM file and the chassis of its
 * bicycle. The F1 is the car of every measure before; its lines keep their folders, another car's add its key
 * (data/lines-fe/, data/lines-bicycle-fe/).
 * @typedef {keyof typeof CARS} CarKey
 */
export const CARS = Object.freeze({
  f1: { name: "F1", file: TUM_F1, chassis: CHASSIS },
  fe: { name: "Formule E", file: TUM_FE, chassis: FE_CHASSIS },
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
