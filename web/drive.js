import { createBicycle, profileCar } from "../src/drive/bicycle.js";
import { keyboardInput, mergeInputs, padInput } from "../src/drive/input.js";
import { pathOf } from "../src/drive/pursuit.js";
import { TICK } from "../src/drive/run.js";
import { createSession, lapGap, tickSession } from "../src/drive/session.js";
import { TRACK_NAMES } from "../src/track/names.js";
import { brakingBoards } from "../src/view/boards.js";
import { createLap, positionAt } from "../src/view/lap.js";
import { drawChase } from "./drive-chase.js";
import { createFeedClient } from "./drive-feed.js";
import { drawDrive } from "./drive-view.js";
import { LINE_NAMES, computeLines, loadLines, loadTrack } from "./load.js";

/**
 * The drive page (J4, P9): Sami's car under his keys or his gamepad, a driver beside him (by search, in a worker, or
 * the tuned rule), the ghost of the line's profile ahead or behind. It loads, wires, reads the hands and draws; the drive is src/drive/session.js.
 */
const CAR = createBicycle();
const DRIVEN = ["best", "minCurvature"];
/** @param {string} id @returns {any} */
const $ = (id) => document.getElementById(id);
const els = { track: $("track"), line: $("line"), view: $("view"), pad: $("pad"), opponent: $("opponent"), restart: $("restart"), pause: $("pause"), status: $("status"), road: $("road"), hud: $("hud") };
const keys = new Set();
const state = { offsets: null, text: "", track: null, lap: null, session: null, boards: [], paused: false, assists: true, last: 0, carry: 0, ahead: 150, heading: null };
/** The views (V): from behind the car, or from above, near or far; the metres of road ahead from above at a speed. */
const VIEWS = { chase: { ahead: (u) => 2.5 * u + 60, chase: true }, near: { ahead: (u) => 1.2 * u + 40 }, far: { ahead: (u) => 2.5 * u + 60 } };
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");
const OPPONENTS = { search: "le pilote par recherche", rule: "le pilote réglé" };
const feed = createFeedClient((message) => (els.status.innerHTML = `<span class="error">le pilote par recherche : ${message}</span>`));
const clock = (seconds) => (Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${decimal(seconds % 60, 2).padStart(5, "0")}` : "–");

/** A choice kept in this browser (a convenience: the default without storage). */
function remember(select) {
  try {
    const kept = localStorage.getItem(`circuit.${select.id}`);
    if (kept && [...select.options].some((option) => option.value === kept)) select.value = kept;
  } catch {
    /* no storage */
  }
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(`circuit.${select.id}`, select.value);
    } catch {
      /* no storage */
    }
    els.road.focus();
  });
}

/** The best lap kept in this browser, per track and line (a convenience: none without storage). */
function bestKey() {
  return `circuit.best.${els.track.value}.${els.line.value}`;
}
function readBest() {
  try {
    return Number(localStorage.getItem(bestKey())) || Infinity;
  } catch {
    return Infinity;
  }
}
function keepBest(time) {
  try {
    if (time < readBest()) localStorage.setItem(bestKey(), String(time));
  } catch {
    /* no storage: the best lap lasts the page */
  }
}

/** A new drive on the chosen line. */
function restart() {
  const { track } = state;
  const lap = createLap(track, profileCar(CAR), state.offsets[els.line.value]);
  state.lap = lap;
  const fed = els.opponent.value === "search";
  state.session = createSession({ track, path: pathOf(lap, track), car: CAR, assists: state.assists, fed });
  feed.start(fed ? state.session : null, { text: state.text, offsets: state.offsets[els.line.value] });
  state.boards = brakingBoards(track, lap);
  state.heading = null;
  state.low = Math.min(...lap.profile.speed);
  state.high = Math.max(...lap.profile.speed);
  state.seen = 0;
  els.status.textContent = `${els.track.value} : le profil de la ligne fait ${decimal(lap.time)} s avec cette voiture. Accélère !`;
  els.road.focus();
}

async function selectTrack(name) {
  els.status.textContent = `${name} : chargement…`;
  try {
    const { track, text } = await loadTrack(name);
    state.track = track;
    state.text = text;
    state.offsets = (await loadLines(name, "lines-bicycle")) ?? (await loadLines(name)) ?? (await computeLines(text, "references"));
    const chosen = els.line.value;
    els.line.replaceChildren(...DRIVEN.filter((key) => state.offsets[key]).map((key) => new Option(LINE_NAMES[key], key)));
    if (state.offsets[chosen]) els.line.value = chosen;
    restart();
  } catch (error) {
    els.status.innerHTML = `<span class="error">${error.message}</span>`;
  }
}

/** The hands: the keys held and the first gamepad. */
function hands() {
  const pad = [...(navigator.getGamepads?.() ?? [])].find(Boolean) ?? null;
  return mergeInputs(keyboardInput(keys), padInput(pad, els.pad.value));
}

/** The pose of a car state, for the drawing. */
const poseOf = ({ x, y, heading }) => ({ x, y, heading });

/** A closed lap, with its time off the track if any. @param {{ time: number, off: number } | undefined} lap */
function lapText(lap) {
  if (!lap) return "–";
  const off = lap.off > 0 ? " (" + decimal(lap.off, 1) + " s hors piste)" : "";
  return clock(lap.time) + off;
}

/** The panel over the road: speed, lap, gaps, laps closed. */
function showHud(session) {
  const { player, robot } = session;
  const { elapsed, gap } = lapGap(session, state.lap.clock);
  const last = player.laps.at(-1);
  if (player.laps.length > state.seen) {
    state.seen = player.laps.length;
    if (last.off === 0) keepBest(last.time);
  }
  const lastText = lapText(last);
  const robotLast = robot.laps.at(-1);
  els.hud.innerHTML = [
    `<b>${decimal(player.state.u * 3.6, 0)}</b> km/h`,
    `tour ${clock(elapsed)} · <span class="${gap > 0 ? "loss" : "gain"}">${gap > 0 ? "+" : "−"}${decimal(Math.abs(gap))} s</span> sur le fantôme`,
    `dernier ${lastText} · meilleur ${clock(readBest())}`,
    `${OPPONENTS[els.opponent.value]} : ${robotLast ? clock(robotLast.time) : "en route"} · le profil : ${clock(state.lap.time)}`,
    `aides (T) : ${session.playerCar.assists ? "antipatinage et ABS" : "aucune"}`,
    player.off ? `<span class="loss">hors piste</span>` : "",
  ].join("<br>");
}

/** Sizes the canvas to its box at the screen's pixel ratio. */
function sized(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

/** The camera's heading, a fifth of the way towards the car's each frame: a slide shows from behind. */
function cameraHeading(heading) {
  const from = state.heading ?? heading;
  state.heading = from + 0.2 * Math.atan2(Math.sin(heading - from), Math.cos(heading - from));
  return state.heading;
}

function draw() {
  const { session, lap } = state;
  const { player, robot } = session;
  const view = VIEWS[els.view.value] ?? VIEWS.chase;
  state.ahead += (view.ahead(player.state.u) - state.ahead) * 0.05;
  const ghost = positionAt(lap, session.time - player.lapStart);
  const { ctx, width, height } = sized(els.road);
  const scene = { track: state.track, line: lap, low: state.low, high: state.high, player: poseOf(player.state), robot: poseOf(robot.state), ghost, boards: state.boards, ahead: state.ahead, width, height };
  const camera = { x: player.state.x, y: player.state.y, heading: cameraHeading(player.state.heading) };
  if (view.chase) drawChase(ctx, { ...scene, camera, index: player.index });
  else drawDrive(ctx, scene);
  showHud(session);
}

function frame(now) {
  const dt = Math.min(0.1, (now - state.last) / 1000);
  state.last = now;
  if (state.session && !state.paused) {
    state.carry += dt;
    const input = hands();
    while (state.carry >= TICK) {
      tickSession(state.session, input);
      state.carry -= TICK;
    }
    feed.topUp();
  }
  if (state.session) draw();
  requestAnimationFrame(frame);
}

/** The keys the drive uses, kept from scrolling the page. */
const DRIVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ControlLeft", "Space"]);

function wire() {
  els.track.replaceChildren(...TRACK_NAMES.map((name) => new Option(name, name)));
  els.track.value = TRACK_NAMES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "Monza";
  els.track.addEventListener("change", () => {
    location.hash = els.track.value;
    selectTrack(els.track.value);
  });
  els.line.addEventListener("change", restart);
  for (const select of [els.view, els.pad, els.opponent]) remember(select);
  els.opponent.addEventListener("change", restart);
  els.restart.addEventListener("click", restart);
  els.pause.addEventListener("click", () => (state.paused = !state.paused));
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLSelectElement) return;
    if (DRIVE_KEYS.has(event.code)) event.preventDefault();
    if (event.code === "KeyR") restart();
    else if (event.code === "Space") state.paused = !state.paused;
    else if (event.code === "KeyT" && state.session) state.session.playerCar.assists = state.assists = !state.assists;
    else if (event.code === "KeyV") els.view.selectedIndex = (els.view.selectedIndex + 1) % els.view.options.length;
    keys.add(event.code);
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());
}

wire();
selectTrack(els.track.value);
requestAnimationFrame(frame);
