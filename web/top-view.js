import { speedColour } from "../src/view/colours.js";
import { project } from "../src/view/frame.js";
import { positionAt } from "../src/view/lap.js";

/**
 * The track from above (J3): the asphalt between its edges, line B as a dark thread, line A coloured by its speed, the
 * apexes of both, the start line, and the two ghosts at the same moment of their laps. It only draws.
 * @typedef {import("../src/types.js").Track} Track
 * @typedef {import("../src/view/lap.js").Lap} Lap
 * @typedef {import("../src/view/frame.js").Frame} Frame
 * @typedef {{ track: Track, a: Lap, b: Lap, frame: Frame, t: number, corners: { apexLine: number, apexReference: number }[], low: number, high: number }} TopScene
 */

const ASPHALT = "#a3a18a";
const EDGE = "#5f5f00";
const THREAD = "rgb(47 47 0 / 0.75)";
const GHOST_A = "#1d1d00";
const GHOST_B = "#f4f4e4";

/** The asphalt: the left edge forwards, the right edge backwards. */
function drawAsphalt(ctx, { track, frame }) {
  const { x, y, nx, ny, wLeft, wRight, count } = track;
  ctx.beginPath();
  for (let i = 0; i < count; i += 1) ctx.lineTo(...project(frame, x[i] + nx[i] * wLeft[i], y[i] + ny[i] * wLeft[i]));
  ctx.closePath();
  ctx.moveTo(...project(frame, x[0] - nx[0] * wRight[0], y[0] - ny[0] * wRight[0]));
  for (let i = count - 1; i >= 0; i -= 1) ctx.lineTo(...project(frame, x[i] - nx[i] * wRight[i], y[i] - ny[i] * wRight[i]));
  ctx.closePath();
  ctx.fillStyle = ASPHALT;
  ctx.fill("evenodd");
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** The start line, across the track at its first point. */
function drawStart(ctx, { track, frame }) {
  const { x, y, nx, ny, wLeft, wRight } = track;
  ctx.beginPath();
  ctx.moveTo(...project(frame, x[0] + nx[0] * wLeft[0], y[0] + ny[0] * wLeft[0]));
  ctx.lineTo(...project(frame, x[0] - nx[0] * wRight[0], y[0] - ny[0] * wRight[0]));
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** Line B, one dark thread. */
function drawThread(ctx, lap, frame, width) {
  ctx.beginPath();
  for (let i = 0; i <= lap.x.length; i += 1) ctx.lineTo(...project(frame, lap.x[i % lap.x.length], lap.y[i % lap.x.length]));
  ctx.strokeStyle = THREAD;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Line A, each step in the colour of its speed. */
function drawSpeeds(ctx, { a, frame, low, high }, width) {
  const n = a.x.length;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i += 1) {
    const next = i + 1 < n ? i + 1 : 0;
    ctx.beginPath();
    ctx.moveTo(...project(frame, a.x[i], a.y[i]));
    ctx.lineTo(...project(frame, a.x[next], a.y[next]));
    ctx.strokeStyle = speedColour(a.profile.speed[i], low, high);
    ctx.stroke();
  }
}

/** A round at a point: filled for A's apexes, hollow for B's. */
function dot(ctx, [px, py], radius, filled) {
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  ctx.lineWidth = 2;
  ctx.strokeStyle = GHOST_A;
  ctx.fillStyle = GHOST_A;
  if (filled) ctx.fill();
  else ctx.stroke();
}

/** A ghost: a triangle pointing where it goes, `size` pixels long. */
function drawGhost(ctx, lap, { frame, t }, { size, fill }) {
  const at = positionAt(lap, t);
  const [px, py] = project(frame, at.x, at.y);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-at.heading);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size / 2, size / 2);
  ctx.lineTo(-size / 2, -size / 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = GHOST_A;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {TopScene} scene
 */
export function drawTop(ctx, scene) {
  const { frame, a, b, corners } = scene;
  ctx.clearRect(0, 0, frame.width, frame.height);
  drawAsphalt(ctx, scene);
  drawStart(ctx, scene);
  const metres = frame.scale;
  drawThread(ctx, b, frame, Math.max(1.2, Math.min(3, 0.4 * metres)));
  drawSpeeds(ctx, scene, Math.max(2.5, Math.min(8, 1.2 * metres)));
  const radius = Math.max(3, Math.min(7, 1.5 * metres));
  for (const corner of corners) {
    dot(ctx, project(frame, b.x[corner.apexReference], b.y[corner.apexReference]), radius, false);
    dot(ctx, project(frame, a.x[corner.apexLine], a.y[corner.apexLine]), radius * 0.7, true);
  }
  const size = Math.max(9, Math.min(24, 5 * metres));
  drawGhost(ctx, b, scene, { size, fill: GHOST_B });
  drawGhost(ctx, a, scene, { size, fill: GHOST_A });
}
