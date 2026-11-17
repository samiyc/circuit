/**
 * Where the wet line goes against the dry one (P8, docs/pluie.md § 3; the schools' wet line, docs/recherche/questions.md
 * § 4, question 3: off the dry line, wider at the entry, crossing it only where it must). Each corner of the dry line
 * is cut into five phases: the BEFORE metres up to it, its three thirds (entry, middle, exit), the AFTER metres past
 * it. In each, the mean shift of the wet line to the outside of the corner, and the share of the band's drop it suffers,
 * (1 − d²/half²)² as src/profile/surface.js counts it: 1 on the dry line, 0 off its band. Pure: offsets in, numbers
 * out.
 * @typedef {import("./corners.js").Corner} Corner
 * @typedef {{ outward: number, felt: number, points: number }} PhaseShift m, a share
 */

export const PHASES = Object.freeze(["avant", "entrée", "milieu", "sortie", "après"]);
/** m before and after a corner. */
export const BEFORE = 60;
export const AFTER = 60;

/** The points from `from`, `metres` along the steps forward (direction 1) or back (−1), `from` left out. */
function walk(step, from, metres, direction) {
  const n = step.length;
  const points = [];
  let [i, walked] = [from, 0];
  while (walked < metres && points.length < n) {
    const next = (i + direction + n) % n;
    walked += step[direction > 0 ? i : next];
    points.push(next);
    i = next;
  }
  return points;
}

/** A corner's points in its five phases. @param {Corner} corner @param {Float64Array} step */
function phasesOf({ from, to }, step) {
  const n = step.length;
  const inside = [];
  for (let i = from; ; i = (i + 1) % n) {
    inside.push(i);
    if (i === to) break;
  }
  const third = inside.length / 3;
  return [
    walk(step, from, BEFORE, -1),
    inside.slice(0, Math.round(third)),
    inside.slice(Math.round(third), Math.round(2 * third)),
    inside.slice(Math.round(2 * third)),
    walk(step, to, AFTER, 1),
  ];
}

/**
 * The wet line's shift in each phase, over all the corners.
 * @param {Corner[]} corners of the dry line
 * @param {{ dry: Float64Array, wet: Float64Array, step: Float64Array, half: number }} lines offsets; step: the dry
 *   line's, m from each point to the next; half: the band's half-width, m
 * @returns {Record<string, PhaseShift>}
 */
export function wetShifts(corners, { dry, wet, step, half }) {
  const sums = PHASES.map(() => ({ outward: 0, felt: 0, points: 0 }));
  for (const corner of corners) {
    phasesOf(corner, step).forEach((points, k) => {
      for (const i of points) {
        const shift = wet[i] - dry[i];
        sums[k].outward -= corner.sign * shift;
        sums[k].felt += Math.max(0, 1 - (shift * shift) / (half * half)) ** 2;
        sums[k].points += 1;
      }
    });
  }
  const mean = ({ outward, felt, points }) => ({ outward: outward / (points || 1), felt: felt / (points || 1), points });
  return Object.fromEntries(PHASES.map((phase, k) => [phase, mean(sums[k])]));
}
