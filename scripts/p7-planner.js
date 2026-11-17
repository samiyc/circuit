import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { bicycleOf, carOf, linesDir } from "../src/cars.js";
import { profileCar } from "../src/drive/bicycle.js";
import { PLANNER, createPlanner, plannedControls } from "../src/drive/planner.js";
import { createPursuit, pathOf, pursue } from "../src/drive/pursuit.js";
import { driveLap, startOf } from "../src/drive/run.js";
import { createLap } from "../src/view/lap.js";
import { TRACK_NAMES, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * P7, the driver by search against the tuned rule (docs/pilote.md § 9): both drive the minimum-curvature line and the
 * best one of data/lines-bicycle/ on the tracks given (all 25 by default), from the same start. `name=value`
 * arguments override PLANNER's settings, `id=` names the output, tmp/p7-planner/<id>.json; `car=fe` drives the
 * Formula E on its own lines (data/lines-bicycle-fe/, docs/voitures.md). About 5 s a lap at a budget of 40: through
 * the queue.
 */
const LINES = ["minCurvature", "best"];
const args = process.argv.slice(2);
const options = Object.fromEntries(args.filter((arg) => arg.includes("=")).map((arg) => arg.split("=")));
const CAR = bicycleOf(options.car ?? "f1");
/** The rule both drive on: the car's (P7's for the F1). */
const TUNED = carOf(options.car ?? "f1").rule;
/** The rule the search corrects: the car's (`search`), or the rule's with `base=rule`. */
const SEARCHED = options.base === "rule" ? TUNED : carOf(options.car ?? "f1").search;
const names = args.filter((arg) => !arg.includes("=")).length ? args.filter((arg) => !arg.includes("=")) : TRACK_NAMES;
const settings = { ...PLANNER, ...Object.fromEntries(Object.keys(PLANNER).filter((key) => key in options).map((key) => [key, Number(options[key])])) };

/** One line driven by the rule and by the planner. */
function race(name, track, offsets, line) {
  const lap = createLap(track, profileCar(CAR), offsets);
  const path = pathOf(lap, track);
  const start = () => startOf(path, TUNED.margin);
  const rule = createPursuit(path, TUNED);
  const ruled = driveLap({ track, path, car: CAR, driver: rule, drive: (state) => pursue(rule, CAR, state) }, { state: start() });
  const planner = createPlanner({ track, path, car: CAR }, { settings, rule: SEARCHED, seed: Number(options.seed ?? 1) });
  const planned = driveLap({ track, path, car: CAR, driver: planner.driver, drive: (state) => plannedControls(planner, state) }, { state: start() });
  const shown = (lap2) => (lap2.finished ? lap2.time.toFixed(2) : `arrêt à ${lap2.time.toFixed(1)}`);
  console.log(`${name} ${line} : profil ${lap.time.toFixed(2)}, règle ${shown(ruled)} (${ruled.offTime.toFixed(2)} hors piste), planifié ${shown(planned)} (${planned.offTime.toFixed(2)})`);
  return { name, line, profile: lap.time, rule: ruled, planned, plans: planner.plans };
}

if (!tracksDownloaded()) throw new Error("Les pistes manquent : npm run tracks");
const runs = names.flatMap((name) => {
  const track = readTrack(name);
  const data = JSON.parse(readFileSync(`${linesDir("data/lines-bicycle", options.car ?? "f1")}/${name}.json`, "utf8"));
  return LINES.map((line) => race(name, track, Float64Array.from(data.lines[line]), line));
});
mkdirSync("tmp/p7-planner", { recursive: true });
writeFileSync(`tmp/p7-planner/${options.id ?? "base"}.json`, JSON.stringify({ car: options.car ?? "f1", settings, names, runs }, null, 1));
