import { mkdirSync, writeFileSync } from "node:fs";
import { pointMassF1 } from "../src/car.js";
import { closedLength } from "../src/geometry.js";
import { HALF_WIDTH, lineBounds, linePoints, TUM_HALF_WIDTH } from "../src/line/line.js";
import { centreLine, minCurvatureLine, shortestLine } from "../src/line/references.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { lineGap } from "./lib/compare.js";
import { readRaceline, readTrack, TRACK_NAMES } from "./lib/tracks.js";

/**
 * `npm run references [Track…]`: the three reference lines of P1 on TU Munich's tracks (all 25 by default), their
 * lap times with the TUM F1 as a point mass, and our minimum-curvature line against TU Munich's at their margin
 * (0.75 m): its lap time under our profile and the gap between the two lines. A table on the console, the rows in
 * tmp/references.json. Long: through the queue (`mcts-backlog --add`), or `--slot` for a few tracks.
 */
const car = pointMassF1();
const names = process.argv.length > 2 ? process.argv.slice(2) : TRACK_NAMES;

/** The lap time and the length of a line given by its offsets. */
function scored(track, offsets, profile) {
  const points = linePoints(track, offsets);
  return { time: lapTime(car, points, profile), length: closedLength(points.x, points.y), points };
}

/** The three references at the F1's half width. */
function references(track, profile) {
  const bounds = lineBounds(track, HALF_WIDTH);
  const started = performance.now();
  const shortest = shortestLine(track, bounds);
  const minCurvature = minCurvatureLine(track, bounds);
  return {
    centre: scored(track, centreLine(track, bounds), profile).time,
    shortest: scored(track, shortest.offsets, profile).time,
    minCurvature: scored(track, minCurvature.offsets, profile).time,
    iterations: [shortest.iterations, minCurvature.iterations],
    seconds: (performance.now() - started) / 1000,
  };
}

/** Our minimum-curvature line against TU Munich's, both at their margin. */
function againstTum(name, track, profile) {
  const ours = scored(track, minCurvatureLine(track, lineBounds(track, TUM_HALF_WIDTH)).offsets, profile);
  const tum = readRaceline(name);
  const tumTime = lapTime(car, tum, createProfile(tum.x.length));
  const gap = lineGap(ours.points, tum);
  return { ours: ours.time, tum: tumTime, gapMean: gap.mean, gapMax: gap.max };
}

const seconds = (value) => value.toFixed(2).replace(".", ",");
const rows = [];
console.log("| Piste | Centre | Plus courte | Courbure min. | à 0,75 m : la nôtre | celle de TUM | écart moyen / max (m) | calcul (s) |");
console.log("|---|---|---|---|---|---|---|---|");
for (const name of names) {
  const track = readTrack(name);
  const profile = createProfile(track.count);
  const row = { name, points: track.count, ...references(track, profile), tum: againstTum(name, track, profile) };
  rows.push(row);
  const { tum } = row;
  const cells = [row.centre, row.shortest, row.minCurvature, tum.ours, tum.tum].map(seconds);
  console.log(`| ${name} | ${cells.join(" | ")} | ${seconds(tum.gapMean)} / ${seconds(tum.gapMax)} | ${row.seconds.toFixed(1)} |`);
}
mkdirSync("tmp", { recursive: true });
writeFileSync("tmp/references.json", `${JSON.stringify({ car: "pointMassF1", halfWidth: HALF_WIDTH, rows }, null, 2)}\n`);
