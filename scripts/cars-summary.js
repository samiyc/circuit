import { readFileSync, readdirSync } from "node:fs";
import { paired } from "mcts-commun/measure.js";
import { findCorners } from "../src/analysis/corners.js";
import { PHASES, wetShifts } from "../src/analysis/wet.js";
import { bicycleOf, linesDir, pointMassOf } from "../src/cars.js";
import { profileCar } from "../src/drive/bicycle.js";
import { createLap } from "../src/view/lap.js";
import { linesOption, readTrack } from "./lib/tracks.js";

/**
 * `node scripts/cars-summary.js --car=fe [--bicycle]`: does the line change with the car (docs/voitures.md)? From the
 * lines searched for the F1 (data/lines/) and for the other car (data/lines-fe/), on each track: the time the car's
 * own line gains on the F1's, driven by that car, with its 95 % interval, and the control (the F1 on the other car's
 * line, slower); the share of the lap's metres on the brakes, each car on its line; where its line goes against the
 * F1's in each phase of the F1 line's corners (src/analysis/wet.js), metres to the outside.
 */
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");
const option = linesOption(process.argv.slice(2));
const car = option.lineCar;
const f1 = option.bicycle ? profileCar(bicycleOf("f1")) : pointMassOf("f1");
const F1_DIR = linesDir(option.bicycle ? "data/lines-bicycle" : "data/lines", "f1");
const best = (dir, name) => Float64Array.from(JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8")).lines.best);

/** The share of the lap's metres where the speed drops. */
function braking({ profile }) {
  let [metres, total] = [0, 0];
  for (let i = 0; i < profile.step.length; i += 1) {
    total += profile.step[i];
    if (profile.speed[(i + 1) % profile.step.length] < profile.speed[i]) metres += profile.step[i];
  }
  return metres / total;
}

/** One track: the four laps, and the shifts of the car's line against the F1's. */
function rowOf(file) {
  const name = file.replace(/\.json$/, "");
  const track = readTrack(name);
  const [lineF1, line] = [best(F1_DIR, name), best(option.dir, name)];
  const laps = { own: createLap(track, car, line), f1Line: createLap(track, car, lineF1), f1: createLap(track, f1, lineF1), f1OnOther: createLap(track, f1, line) };
  const corners = findCorners(laps.f1.profile.curvature);
  return { name, laps, shifts: wetShifts(corners, { dry: lineF1, wet: line, step: laps.f1.profile.step, half: 1 }) };
}

const rows = readdirSync(option.dir).map(rowOf);
const time = (key) => rows.map((row) => -row.laps[key].time);
const gain = paired(time("own"), time("f1Line"));
const control = paired(time("f1"), time("f1OnOther"));
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
console.log(`\n## ${option.car}${option.bicycle ? " (bicyclette)" : ""}, ${rows.length} pistes\n`);
console.log(`Son tour : ${decimal(100 * mean(rows.map((row) => row.laps.own.time / row.laps.f1.time)), 1)} % du tour de la F1.`);
console.log(`Sa ligne gagne ${decimal(gain.mean)} s [${decimal(gain.low)} ; ${decimal(gain.high)}] sur celle de la F1, ${gain.wins}/${gain.losses}.`);
console.log(`Le contrôle : la F1 sur cette ligne perd ${decimal(control.mean)} s [${decimal(control.low)} ; ${decimal(control.high)}], ${control.wins}/${control.losses}.`);
console.log(`Les mètres au freinage : ${decimal(100 * mean(rows.map((row) => braking(row.laps.own))), 1)} % du tour, la F1 ${decimal(100 * mean(rows.map((row) => braking(row.laps.f1))), 1)} %.\n`);
const totals = Object.fromEntries(PHASES.map((phase) => [phase, { outward: 0, points: 0 }]));
for (const row of rows) {
  for (const [phase, shift] of Object.entries(row.shifts)) {
    totals[phase].outward += shift.outward * shift.points;
    totals[phase].points += shift.points;
  }
}
console.log("| Phase | Vers l'extérieur (m) |\n|---|--:|");
for (const phase of PHASES) console.log(`| ${phase} | ${decimal(totals[phase].outward / totals[phase].points)} |`);
