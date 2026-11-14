import { existsSync, readdirSync, readFileSync } from "node:fs";
import { paired } from "mcts-commun/measure.js";
import { pointMassF1 } from "../src/car.js";
import { along, apexShifts, findCorners } from "../src/analysis/corners.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { readTrack } from "./lib/tracks.js";

/**
 * `node scripts/p3-summary.js`: the measures of scripts/p3.js (docs/ligne-cmaes.md, §§ 4-8). For each part and
 * budget, each method's mean gain on the minimum-curvature line and its pairs against the part's reference (the climb
 * at 40 m), on the same track and seed. Then the check of P2: the apex shifts and the exit speeds of the climb's line
 * (40 m, 100 000 lines, seed 1) against the minimum curvature, by the length of the straight after the corner.
 */
const rows = readdirSync("tmp/p3")
  .filter((file) => file.endsWith(".jsonl"))
  .flatMap((file) => readFileSync(`tmp/p3/${file}`, "utf8").trim().split("\n").map((line) => JSON.parse(line)));
const reference = new Map(rows.filter((row) => !row.method).map((row) => [row.track, row.minCurvature]));
const runs = rows.filter((row) => row.method);
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");
const REFERENCE_OF = { cmaes: "climb", fine: "climb40", finer: "coarse40to20" };

/** One line: a method at a budget, its gain, and its pairs against the part's reference. */
function line(part, budget, method) {
  const of = (name) => new Map(runs.filter((r) => r.part === part && r.budget === budget && r.method === name).map((r) => [`${r.track}|${r.seed}`, r]));
  const mine = of(method);
  const theirs = of(REFERENCE_OF[part]);
  const pairs = [...mine.keys()].filter((pair) => theirs.has(pair));
  const mean = (value) => pairs.reduce((sum, pair) => sum + value(pair), 0) / pairs.length;
  const gain = mean((pair) => reference.get(mine.get(pair).track) - mine.get(pair).time);
  const versus = paired(
    pairs.map((pair) => -mine.get(pair).time),
    pairs.map((pair) => -theirs.get(pair).time),
  );
  const seconds = mean((pair) => mine.get(pair).seconds);
  return `| ${method} | ${budget} | ${pairs.length} | ${decimal(gain)} | ${decimal(versus.mean)} [${decimal(versus.low)} ; ${decimal(versus.high)}] | ${versus.wins}/${versus.losses} | ${decimal(seconds, 1)} |`;
}

function tables() {
  for (const part of ["cmaes", "fine", "finer"]) {
    const mine = runs.filter((r) => r.part === part);
    if (mine.length === 0) continue;
    console.log(`\n### ${part} (contre ${REFERENCE_OF[part]})\n`);
    console.log("| Méthode | Budget | Paires | Gain (s) | − la référence (s, IC 95 %) | gagne / perd | Calcul (s) |");
    console.log("|---|---|---|---|---|---|---|");
    const budgets = [...new Set(mine.map((r) => r.budget))].sort((a, b) => a - b);
    const methods = [...new Set(mine.map((r) => r.method))];
    for (const budget of budgets) for (const method of methods) console.log(line(part, budget, method));
  }
}

/** The corners of one track, with the shifts of the climb's line. */
function cornersOf(track) {
  const path = `tmp/p3/lines/${track}-cmaes.json`;
  if (!existsSync(path)) return [];
  const saved = JSON.parse(readFileSync(path, "utf8"));
  const geometry = readTrack(track);
  const bounds = lineBounds(geometry);
  const car = pointMassF1();
  const lines = { reference: Float64Array.from(saved.minCurvature), line: Float64Array.from(saved.runs["climb-100000"].offsets) };
  const profiles = { reference: createProfile(geometry.count), line: createProfile(geometry.count) };
  lapTime(car, linePoints(geometry, lines.reference), profiles.reference);
  lapTime(car, linePoints(geometry, lines.line), profiles.line);
  const distance = along(profiles.reference.step);
  const length = distance[geometry.count - 1] + profiles.reference.step[geometry.count - 1];
  const speeds = { reference: profiles.reference.speed, line: profiles.line.speed };
  return apexShifts(findCorners(profiles.reference.curvature), { ...lines, bounds, distance, length, speeds });
}

const BINS = [
  [0, 100],
  [100, 300],
  [300, 600],
  [600, Infinity],
];

function apexTable() {
  const corners = [...reference.keys()].flatMap(cornersOf);
  if (corners.length === 0) return;
  console.log(`\n### Le contrôle de P2 : ${corners.length} virages\n`);
  console.log("| Ligne droite après (m) | Virages | Corde déplacée | dont plus tard | Décalage moyen (m) | Vitesse de sortie gagnée (km/h) |");
  console.log("|---|---|---|---|---|---|");
  for (const [low, high] of BINS) {
    const bin = corners.filter((c) => c.straightAfter >= low && c.straightAfter < high);
    const moved = bin.filter((c) => Math.abs(c.shift) > 2);
    const later = moved.filter((c) => c.shift > 0).length;
    const mean = (values) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
    const label = Number.isFinite(high) ? `${low} à ${high}` : `${low} et plus`;
    console.log(`| ${label} | ${bin.length} | ${moved.length} | ${later} | ${decimal(mean(moved.map((c) => c.shift)), 1)} | ${decimal(mean(bin.map((c) => c.exitGain * 3.6)), 1)} |`);
  }
}

console.log(`${reference.size} piste(s), ${runs.length} recherches`);
tables();
apexTable();
