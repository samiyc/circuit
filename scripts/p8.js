import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { progress } from "mcts-commun/trace.js";
import { linesDir } from "../src/cars.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { BAND, WET, onSurface } from "../src/profile/surface.js";
import { bestLine } from "../src/search/best-line.js";
import { TRACK_NAMES, linesOption, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * P8, the rain (docs/pluie.md): `node scripts/p8.js <condition> [--bicycle] [Piste…]` searches the line on a wet road,
 * as `npm run lines` searches the dry one (src/search/best-line.js, from the minimum-curvature line, seed 1, 100 000
 * lap times a stage), into data/lines-wet/<condition>/<Track>.json. The conditions: `wet`, the grip at WET everywhere;
 * `band` and `band30`, the dry line's band too, 1.5 m wide at 15 % and 30 % of grip lost; `wide`, the band 3 m wide at
 * 15 %. The dry line is the best of data/lines/. `--bicycle`: for the profile of the car that slips, from
 * data/lines-bicycle/ into data/lines-wet-bicycle/ (the drive page). `--car=fe`: the Formula E's, its folders suffixed
 * (data/lines-wet-bicycle-fe/). About 25 s a track: through the queue.
 */
export const CONDITIONS = Object.freeze({
  wet: { drop: 0, half: BAND.half },
  band: { drop: BAND.drop, half: BAND.half },
  band30: { drop: 0.3, half: BAND.half },
  wide: { drop: BAND.drop, half: 3 },
});

if (!tracksDownloaded()) throw new Error("Les pistes manquent : npm run tracks");
const option = linesOption(process.argv.slice(2));
const [condition, ...rest] = option.rest;
if (!(condition in CONDITIONS)) throw new Error(`condition inconnue : ${condition} (${Object.keys(CONDITIONS).join(", ")})`);
const dir = `${linesDir(option.bicycle ? "data/lines-wet-bicycle" : "data/lines-wet", option.car)}/${condition}`;
const dryCar = option.lineCar;
const names = rest.length ? rest : TRACK_NAMES;
mkdirSync(dir, { recursive: true });
for (const [k, name] of names.entries()) {
  const started = performance.now();
  const track = readTrack(name);
  const dryLines = JSON.parse(readFileSync(`${option.dir}/${name}.json`, "utf8")).lines;
  const [dry, base] = [Float64Array.from(dryLines.best), Float64Array.from(dryLines.minCurvature)];
  const { drop, half } = CONDITIONS[condition];
  const surface = { wet: WET, ...(drop > 0 && { line: linePoints(track, dry), half, drop }) };
  const car = onSurface(dryCar, surface);
  const { search, best } = bestLine({ track, car, bounds: lineBounds(track), base }, { seed: 1 });
  const time = (offsets, on = car) => lapTime(on, linePoints(track, offsets), createProfile(track.count));
  const times = { dry: time(dry, dryCar), dryWet: time(dry), search: time(search), best: time(best) };
  const data = { track: name, condition, car: option.bicycle ? "bicycle" : "pointMass", vehicle: option.car, surface: { wet: WET, half, drop }, seed: 1, budget: 100000, times, lines: { search: [...search], best: [...best] } };
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(data));
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  console.log(`${name} ${condition} : la ligne sèche ${times.dryWet.toFixed(2)} s, la ligne de pluie ${times.best.toFixed(2)} s (${seconds} s)`);
  progress("p8", k + 1, names.length, { unit: "piste" });
}
