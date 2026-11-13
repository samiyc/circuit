import { PerformanceObserver } from "node:perf_hooks";
import { pointMassF1 } from "../src/car.js";
import { linePoints, placeLine } from "../src/line/line.js";
import { createProfile, lapTime } from "../src/profile/profile.js";
import { decimate, createTrack } from "../src/track/track.js";
import { readTrack, TRACK_NAMES } from "./lib/tracks.js";
import { createRng } from "mcts-commun/random.js";

/**
 * `npm run bench [laps per line]`: the cost of the score, a lap time, per lap and per point, on the 25 tracks of TU
 * Munich at their own spacing (about 5 m) and at every 2nd and 4th point, for lines of seeded offsets placed anew
 * each lap, as a search will (docs/recherche/pistes.md, P1: this cost sets P2's budget). It counts the garbage
 * collections and the heap grown around the timed laps: the hot path allocates nothing.
 */
const laps = Number(process.argv[2] ?? 2000);
const car = pointMassF1();
const rng = createRng(14112026);

/** Lines of small seeded offsets, as CMA-ES will draw them. */
function seededLines(track, count) {
  return Array.from({ length: count }, () => Float64Array.from({ length: track.count }, () => 2 * (rng.next() - 0.5)));
}

/** Microseconds a lap: each lap places a line then scores it, all in preallocated buffers. */
function timed(track) {
  const lines = seededLines(track, 16);
  const points = linePoints(track, lines[0]);
  const profile = createProfile(track.count);
  let sink = 0;
  for (let i = 0; i < 200; i += 1) sink += lapTime(car, points, profile);
  const heap = process.memoryUsage().heapUsed;
  const started = performance.now();
  for (let i = 0; i < laps; i += 1) {
    placeLine(track, lines[i % lines.length], points.x, points.y);
    sink += lapTime(car, points, profile);
  }
  const micro = ((performance.now() - started) * 1000) / laps;
  return { micro, bytes: (process.memoryUsage().heapUsed - heap) / laps, sink };
}

let collections = 0;
const observer = new PerformanceObserver((list) => {
  collections += list.getEntries().length;
});
observer.observe({ entryTypes: ["gc"] });
const decimal = (value, digits) => value.toFixed(digits).replace(".", ",");
console.log(`${laps} tours par piste et par pas, la F1 de TUM en point matériel\n`);
console.log("| Pas | Points (moyenne) | µs par tour (moyenne) | ns par point | octets par tour (pire piste) |");
console.log("|---|---|---|---|---|");
for (const every of [1, 2, 4]) {
  let points = 0;
  let micro = 0;
  let bytes = 0;
  for (const name of TRACK_NAMES) {
    const track = every === 1 ? readTrack(name) : createTrack(decimate(readTrack(name), every));
    const result = timed(track);
    points += track.count;
    micro += result.micro;
    bytes = Math.max(bytes, result.bytes);
  }
  const n = TRACK_NAMES.length;
  console.log(`| ${every * 5} m | ${Math.round(points / n)} | ${decimal(micro / n, 1)} | ${decimal((micro * 1000) / points, 1)} | ${decimal(bytes, 1)} |`);
}
await new Promise((done) => setTimeout(done, 20));
observer.disconnect();
console.log(`\n${collections} collection(s) pendant le banc, chargement des pistes compris ; le tas mesuré autour des tours chronométrés seuls`);
