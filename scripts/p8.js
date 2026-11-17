import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pointMassF1 } from "../src/car.js";
import { lineBounds, linePoints } from "../src/line/line.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { BAND, WET, onSurface } from "../src/profile/surface.js";
import { bestLine } from "../src/search/best-line.js";
import { TRACK_NAMES, readTrack, tracksDownloaded } from "./lib/tracks.js";

/**
 * P8, the rain (docs/pluie.md): `node scripts/p8.js <condition> [Piste…]` searches the line on a wet road, as `npm run
 * lines` searches the dry one (src/search/best-line.js, from the minimum-curvature line, seed 1, 100 000 lap times a
 * stage), into data/lines-wet/<condition>/<Track>.json. The conditions: `wet`, the grip at WET everywhere; `band` and
 * `band30`, the dry line's band too, at BAND.drop and 30 % of grip lost on it. The dry line is the best of
 * data/lines/. About 25 s a track: through the queue.
 */
export const CONDITIONS = Object.freeze({ wet: 0, band: BAND.drop, band30: 0.3 });

if (!tracksDownloaded()) throw new Error("Les pistes manquent : npm run tracks");
const [condition, ...rest] = process.argv.slice(2);
if (!(condition in CONDITIONS)) throw new Error(`condition inconnue : ${condition} (${Object.keys(CONDITIONS).join(", ")})`);
const dir = `data/lines-wet/${condition}`;
mkdirSync(dir, { recursive: true });
for (const name of rest.length ? rest : TRACK_NAMES) {
  const started = performance.now();
  const track = readTrack(name);
  const dryLines = JSON.parse(readFileSync(`data/lines/${name}.json`, "utf8")).lines;
  const [dry, base] = [Float64Array.from(dryLines.best), Float64Array.from(dryLines.minCurvature)];
  const drop = CONDITIONS[condition];
  const surface = { wet: WET, ...(drop > 0 && { line: linePoints(track, dry), half: BAND.half, drop }) };
  const car = onSurface(pointMassF1(), surface);
  const { search, best } = bestLine({ track, car, bounds: lineBounds(track), base }, { seed: 1 });
  const time = (offsets, on = car) => lapTime(on, linePoints(track, offsets), createProfile(track.count));
  const times = { dry: time(dry, pointMassF1()), dryWet: time(dry), search: time(search), best: time(best) };
  const data = { track: name, condition, surface: { wet: WET, half: BAND.half, drop }, seed: 1, budget: 100000, times, lines: { search: [...search], best: [...best] } };
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(data));
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  console.log(`${name} ${condition} : la ligne sèche ${times.dryWet.toFixed(2)} s, la ligne de pluie ${times.best.toFixed(2)} s (${seconds} s)`);
}
