import { readFileSync, readdirSync } from "node:fs";
import { paired } from "mcts-commun/measure.js";
import { findCorners } from "../src/analysis/corners.js";
import { PHASES, wetShifts } from "../src/analysis/wet.js";
import { pointMassF1 } from "../src/car.js";
import { createLap } from "../src/view/lap.js";
import { readTrack } from "./lib/tracks.js";

/**
 * `node scripts/p8-summary.js [--bicycle]`: P8 from data/lines-wet/ (or data/lines-wet-bicycle/; scripts/p8.js). For each condition, the time the wet line
 * gains on the dry line driven on the same wet road, with its 95 % interval; then where it goes against the dry line
 * in each phase of the corners (src/analysis/wet.js): metres to the outside, share of the band's drop suffered (1 on
 * the dry line, 0 off its band).
 */
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");
const car = pointMassF1();
const ROOT = process.argv.includes("--bicycle") ? "data/lines-wet-bicycle" : "data/lines-wet";
const DRY = process.argv.includes("--bicycle") ? "data/lines-bicycle" : "data/lines";

/** The shifts of one track, summed by phase, weighted by points. */
function shiftsOf(row) {
  const track = readTrack(row.track);
  const dry = Float64Array.from(JSON.parse(readFileSync(`${DRY}/${row.track}.json`, "utf8")).lines.best);
  const lap = createLap(track, car, dry);
  const corners = findCorners(lap.profile.curvature);
  return wetShifts(corners, { dry, wet: Float64Array.from(row.lines.best), step: lap.profile.step, half: row.surface.half });
}

for (const condition of readdirSync(ROOT)) {
  const rows = readdirSync(`${ROOT}/${condition}`).map((file) => JSON.parse(readFileSync(`${ROOT}/${condition}/${file}`, "utf8")));
  const gain = paired(
    rows.map((row) => -row.times.best),
    rows.map((row) => -row.times.dryWet),
  );
  const slower = rows.reduce((sum, row) => sum + row.times.dryWet / row.times.dry, 0) / rows.length;
  console.log(`\n## ${condition} (${rows.length} pistes, μ × ${rows[0].surface.wet}, bande ${decimal(rows[0].surface.drop * 100, 0)} % sur ${decimal(rows[0].surface.half, 1)} m)\n`);
  console.log(`La ligne sèche sous la pluie : ${decimal(100 * slower, 1)} % de son temps sec. La ligne de pluie gagne ${decimal(gain.mean)} s [${decimal(gain.low)} ; ${decimal(gain.high)}], ${gain.wins}/${gain.losses}.\n`);
  const totals = Object.fromEntries(PHASES.map((phase) => [phase, { outward: 0, felt: 0, points: 0 }]));
  for (const row of rows) {
    for (const [phase, shift] of Object.entries(shiftsOf(row))) {
      totals[phase].outward += shift.outward * shift.points;
      totals[phase].felt += shift.felt * shift.points;
      totals[phase].points += shift.points;
    }
  }
  console.log("| Phase | Vers l'extérieur (m) | La bande subie |\n|---|--:|--:|");
  for (const phase of PHASES) {
    const { outward, felt, points } = totals[phase];
    console.log(`| ${phase} | ${decimal(outward / points)} | ${decimal((100 * felt) / points, 0)} % |`);
  }
}
