import { gainBetween } from "../src/view/lap.js";

/**
 * The table of the corners (J3): for each one, where it is, which way it turns, how far A's apex is from B's, the speed
 * A gains at its exit, the straight after it, and the time A gains on B from its start to the next corner's. A click on
 * a row asks to zoom on that corner. It only builds the table.
 * @typedef {{ from: number, to: number, sign: number, apexLine: number, apexReference: number, shift: number, exitGain: number, straightAfter: number }} CornerShift
 */

const decimal = (value, digits = 1) => value.toFixed(digits).replace(".", ",").replace(/^-/, "−");
const signed = (value, digits = 1) => (value > 0 ? "+" : "") + decimal(value, digits);

/** A gain in bold, a loss in red, half a millisecond either way. */
function gainClass(gain) {
  if (gain > 0.0005) return "gain";
  return gain < -0.0005 ? "loss" : "";
}

/** One row's cells. */
function cells(corner, k, { corners, gap, distance }) {
  const next = corners[(k + 1) % corners.length];
  const gain = gainBetween(gap, corner.from, next.from);
  return [
    { text: `${k + 1}`, num: true },
    { text: decimal(distance[corner.from] / 1000, 2), num: true },
    { text: corner.sign > 0 ? "à gauche" : "à droite" },
    { text: Math.abs(corner.shift) <= 2 ? "la même" : `${signed(corner.shift, 0)} m`, num: true },
    { text: signed(corner.exitGain * 3.6), num: true },
    { text: decimal(corner.straightAfter, 0), num: true },
    { text: signed(gain, 3), num: true, className: gainClass(gain) },
  ];
}

/**
 * @param {HTMLTableElement} table
 * @param {{ corners: CornerShift[], gap: Float64Array, distance: Float64Array, onPick: (k: number) => void }} data
 */
export function fillCorners(table, data) {
  table.replaceChildren();
  const head = table.createTHead().insertRow();
  const titles = ["N°", "À (km)", "Sens", "Corde de A", "Sortie A − B (km/h)", "Ligne droite après (m)", "A gagne (s)"];
  titles.forEach((title, k) => {
    const th = document.createElement("th");
    th.textContent = title;
    if (k !== 2) th.className = "num";
    head.append(th);
  });
  const body = table.createTBody();
  data.corners.forEach((corner, k) => {
    const row = body.insertRow();
    for (const cell of cells(corner, k, data)) {
      const td = row.insertCell();
      td.textContent = cell.text;
      td.className = [cell.num ? "num" : "", cell.className ?? ""].join(" ").trim();
    }
    row.addEventListener("click", () => data.onPick(k));
  });
}

/**
 * Marks the row of the corner in view.
 * @param {HTMLTableElement} table
 * @param {number | null} k
 */
export function markCorner(table, k) {
  [...table.tBodies[0]?.rows ?? []].forEach((row, i) => row.classList.toggle("current", i === k));
}
