import { pointMassF1 } from "../src/car.js";
import { lineBounds } from "../src/line/line.js";
import { TRACK_NAMES } from "../src/track/names.js";
import { SPEED_RAMP } from "../src/view/colours.js";
import { fitFrame } from "../src/view/frame.js";
import { createLap, placeAt } from "../src/view/lap.js";
import { fillCorners, markCorner } from "./corners-table.js";
import { LINE_NAMES, computeLines, loadLines, loadTrack } from "./load.js";
import { drawProfile, pointAt } from "./profile-view.js";
import { cornerView, distanceOf, pairOf, trackBox } from "./scene.js";
import { drawTop } from "./top-view.js";

/**
 * The page (J3): a TUM track from above with two lines and their ghosts, the speed along the lap and the gap between
 * them, and the table of the corners. It loads, wires and draws; every number comes from src/.
 */
const CAR = pointMassF1();
const RATES = [0.25, 0.5, 1, 2, 5, 10];
/** The pair shown first, with the search and without it. */
const FOUND = { a: "best", b: "minCurvature" };
const REFERENCES = { a: "minCurvature", b: "centre" };
/** An element of the page, by id. @param {string} id @returns {any} */
const $ = (id) => document.getElementById(id);
const els = { track: $("track"), a: $("line-a"), b: $("line-b"), whole: $("whole"), search: $("search"), status: $("status"), play: $("play"), position: $("position"), rateLabel: $("rate-label"), top: $("top"), profile: $("profile"), frame: $("frame"), legend: $("legend"), corners: $("corners") };
const state = { base: null, text: "", pair: null, a: "best", b: "minCurvature", t: 0, playing: false, rate: 2, zoom: null, last: 0 };
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");

/** The menus of lines, from those the track has; a line it lacks, or A and B the same, falls back to the defaults. */
function fillLineMenus() {
  const { laps } = state.base;
  const defaults = laps.best ? FOUND : REFERENCES;
  if (!laps[state.a] || !laps[state.b] || state.a === state.b) Object.assign(state, defaults);
  const options = () => Object.entries(LINE_NAMES).filter(([name]) => laps[name]).map(([name, label]) => new Option(label, name));
  els.a.replaceChildren(...options());
  els.b.replaceChildren(...options());
  els.a.value = state.a;
  els.b.value = state.b;
  els.search.hidden = Boolean(laps.best);
}

/** A track's laps, from the lines' offsets. */
function setLines(track, offsets) {
  const laps = Object.fromEntries(Object.entries(offsets).map(([key, values]) => [key, createLap(track, CAR, values)]));
  state.base = { track, bounds: lineBounds(track), offsets, laps, distance: distanceOf(laps.centre), box: trackBox(track) };
  fillLineMenus();
  rebuild();
}

async function selectTrack(name) {
  els.status.textContent = `${name} : chargement…`;
  state.zoom = null;
  try {
    const { track, text } = await loadTrack(name);
    state.text = text;
    let offsets = await loadLines(name);
    if (!offsets) {
      els.status.textContent = `${name} : les lignes ne sont pas précalculées (npm run lines), calcul des références…`;
      offsets = await computeLines(text, "references");
    }
    setLines(track, offsets);
  } catch (error) {
    els.status.innerHTML = `<span class="error">${error.message}</span>`;
  }
}

async function search() {
  els.search.disabled = true;
  els.status.textContent = "Recherche en cours (environ 20 s) : 40 → 20 → 10 m, puis la descente…";
  const found = await computeLines(state.text, "best", state.base.offsets.minCurvature);
  els.search.disabled = false;
  setLines(state.base.track, { ...state.base.offsets, ...found });
}

/** The pair, the table and the summary, after a change of track or line. */
function rebuild() {
  state.pair = pairOf(state.base, state.a, state.b);
  fillCorners(els.corners, { corners: state.pair.corners, gap: state.pair.gap, distance: state.base.distance, onPick: zoomOn });
  const { a, b } = state.pair;
  const gain = b.time - a.time;
  els.status.textContent = `${els.track.value} : A ${decimal(a.time)} s, B ${decimal(b.time)} s, A ${gain >= 0 ? "gagne" : "perd"} ${decimal(Math.abs(gain))} s sur B ; ${state.pair.corners.length} virages.`;
  const [low, high] = [state.pair.low * 3.6, state.pair.high * 3.6];
  const stops = SPEED_RAMP.map((c) => "rgb(" + c.join(" ") + ")").join(", ");
  els.legend.innerHTML = `Vitesse de A : ${decimal(low, 0)} km/h<span class="ramp" style="background: linear-gradient(90deg, ${stops})"></span>${decimal(high, 0)} km/h`;
  zoomOn(state.zoom);
}

function zoomOn(k) {
  state.zoom = k;
  els.whole.hidden = k === null;
  markCorner(els.corners, k);
  if (k !== null) state.t = state.pair.a.clock[Math.max(0, state.pair.corners[k].from - 30)];
  draw();
}

/** Sizes a canvas to its box at the screen's pixel ratio, and gives its context in CSS pixels. */
function sized(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

/** The window of the profile and the box of the top view. */
function viewOf() {
  const { track, distance, box } = state.base;
  if (state.zoom === null) return { box, from: 0, to: track.count };
  return cornerView(track, state.pair.corners[state.zoom], distance);
}

function draw() {
  if (!state.pair) return;
  const { a, b, gap, corners, low, high } = state.pair;
  const view = viewOf();
  const top = sized(els.top);
  drawTop(top.ctx, { track: state.base.track, a, b, frame: fitFrame(view.box, top.width, top.height), t: state.t, corners, low, high });
  const index = placeAt(a.clock, state.t).index;
  const profile = sized(els.profile);
  state.scene = { a, b, gap, distance: state.base.distance, from: view.from, to: view.to, index, low, high, width: profile.width, height: profile.height };
  drawProfile(profile.ctx, state.scene);
  const ghostB = placeAt(b.clock, state.t).index;
  const speed = (lap, i) => decimal(lap.profile.speed[i] * 3.6, 0);
  els.frame.textContent = `${decimal(state.t % a.time, 1)} s · ${decimal(state.base.distance[index] / 1000, 2)} km · A ${speed(a, index)} km/h, B ${speed(b, ghostB)} km/h · B en retard de ${decimal(gap[index], 3)} s ici`;
  els.position.value = String((state.t % a.time) / a.time);
}

function tick(now) {
  const dt = Math.min(0.1, (now - state.last) / 1000);
  state.last = now;
  if (state.playing && state.pair) {
    state.t += dt * RATES[state.rate];
    draw();
  }
  requestAnimationFrame(tick);
}

function changeRate(step) {
  state.rate = Math.min(RATES.length - 1, Math.max(0, state.rate + step));
  els.rateLabel.textContent = `× ${String(RATES[state.rate]).replace(".", ",")}`;
}

function wire() {
  els.track.replaceChildren(...TRACK_NAMES.map((name) => new Option(name, name)));
  els.track.value = TRACK_NAMES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "Monza";
  els.track.addEventListener("change", () => {
    location.hash = els.track.value;
    selectTrack(els.track.value);
  });
  els.a.addEventListener("change", () => ((state.a = els.a.value), rebuild()));
  els.b.addEventListener("change", () => ((state.b = els.b.value), rebuild()));
  els.whole.addEventListener("click", () => zoomOn(null));
  els.search.addEventListener("click", search);
  els.play.addEventListener("click", () => {
    state.playing = !state.playing;
    els.play.textContent = state.playing ? "Pause" : "Lecture";
  });
  els.position.addEventListener("input", () => ((state.t = Number(els.position.value) * state.pair.a.time), draw()));
  $("slower").addEventListener("click", () => changeRate(-1));
  $("faster").addEventListener("click", () => changeRate(1));
  els.profile.addEventListener("click", (event) => {
    if (!state.scene) return;
    state.t = state.pair.a.clock[pointAt(state.scene, event.offsetX)];
    draw();
  });
  window.addEventListener("resize", draw);
}

/** The version in the masthead, from the journal of versions. */
async function showVersion() {
  const journal = await fetch("../docs/changelog.json").then((response) => response.json()).catch(() => null);
  if (journal) $("version").textContent = `Version ${journal.versions[0].version} · journal des versions`;
}

wire();
showVersion();
changeRate(0);
selectTrack(els.track.value);
requestAnimationFrame(tick);
