import { speedColour } from "../src/view/colours.js";
import { boxOf, fitFrame, project } from "../src/view/frame.js";

/**
 * The drive seen from above (J4, P9): the camera on Sami's car, its heading up, zoomed out with the speed to show
 * the braking point ahead; the line in the colours of its speed, the ghost of the line's profile and the driver's
 * car; and a small map of the whole track in a corner. It only draws.
 * @typedef {import("../src/types.js").Track} Track
 * @typedef {import("../src/view/lap.js").Lap} Lap
 * @typedef {{ x: number, y: number, heading: number }} Pose
 * @typedef {import("../src/view/boards.js").Board} Board
 * @typedef {{ track: Track, line: Lap, low: number, high: number, player: Pose, robot: Pose, ghost: Pose, boards: Board[], ahead: number, width: number, height: number }} DriveScene
 */

const GRASS = "#9bab6e";
const ASPHALT = "#a3a18a";
const EDGE = "#ffffff";
const KERB = "#8e1b1b";
const PLAYER = "#c23b22";
const ROBOT = "#2f2f00";
const GHOST = "rgb(244 244 228 / 0.8)";
/** m, the car's length and width (an F1 is about 5.6 m by 2 m). */
const CAR = { length: 5.6, width: 2 };

/** The asphalt between the edges, in metres. */
function asphalt(ctx, { x, y, nx, ny, wLeft, wRight, count }, pixel) {
  ctx.beginPath();
  for (let i = 0; i <= count; i += 1) ctx.lineTo(x[i % count] + nx[i % count] * wLeft[i % count], y[i % count] + ny[i % count] * wLeft[i % count]);
  ctx.moveTo(x[0] - nx[0] * wRight[0], y[0] - ny[0] * wRight[0]);
  for (let i = count; i >= 0; i -= 1) ctx.lineTo(x[i % count] - nx[i % count] * wRight[i % count], y[i % count] - ny[i % count] * wRight[i % count]);
  ctx.fillStyle = ASPHALT;
  ctx.fill("evenodd");
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 2 * pixel;
  ctx.stroke();
}

/** The start line across the track, red and white. */
function start(ctx, { x, y, nx, ny, wLeft, wRight }) {
  ctx.beginPath();
  ctx.moveTo(x[0] + nx[0] * wLeft[0], y[0] + ny[0] * wLeft[0]);
  ctx.lineTo(x[0] - nx[0] * wRight[0], y[0] - ny[0] * wRight[0]);
  ctx.strokeStyle = KERB;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** The line, each step in the colour of its speed, a metre wide. */
function line(ctx, { line: lap, low, high }) {
  ctx.lineWidth = 0.8;
  const n = lap.x.length;
  for (let i = 0; i < n; i += 1) {
    ctx.beginPath();
    ctx.moveTo(lap.x[i], lap.y[i]);
    ctx.lineTo(lap.x[(i + 1) % n], lap.y[(i + 1) % n]);
    ctx.strokeStyle = speedColour(lap.profile.speed[i], low, high);
    ctx.stroke();
  }
}

/** The braking boards on the verge, seen from above: a white square, a dark bar per 50 m. */
function boards(ctx, { track, boards: all }) {
  for (const { index, distance, side } of all) {
    const w = side > 0 ? track.wLeft[index] + 3 : -(track.wRight[index] + 3);
    const [x, y] = [track.x[index] + track.nx[index] * w, track.y[index] + track.ny[index] * w];
    ctx.fillStyle = EDGE;
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    ctx.fillStyle = ROBOT;
    for (let s = 0; s < distance / 50; s += 1) ctx.fillRect(x - 1.2, y - 1.2 + s, 2.4, 0.5);
  }
}

/** A car at its pose, a rectangle with a darker nose. */
function car(ctx, { x, y, heading }, fill, pixel) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.fillStyle = fill;
  ctx.strokeStyle = ROBOT;
  ctx.lineWidth = 1.5 * pixel;
  ctx.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
  ctx.strokeRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
  ctx.fillStyle = ROBOT;
  ctx.fillRect(CAR.length / 2 - 1, -CAR.width / 2, 1, CAR.width);
  ctx.restore();
}

/** The small map: the track, and a dot for each car. */
function map(ctx, { track, player, robot, ghost, width }) {
  const size = Math.min(180, width / 4);
  const left = { x: track.x.map((v, i) => v + track.nx[i] * track.wLeft[i]), y: track.y.map((v, i) => v + track.ny[i] * track.wLeft[i]) };
  const frame = fitFrame(boxOf(left), size, size, 8);
  ctx.save();
  ctx.translate(width - size - 8, 8);
  ctx.fillStyle = "rgb(232 232 205 / 0.85)";
  ctx.fillRect(0, 0, size, size);
  ctx.beginPath();
  for (let i = 0; i <= track.count; i += 1) ctx.lineTo(...project(frame, track.x[i % track.count], track.y[i % track.count]));
  ctx.strokeStyle = ROBOT;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const [pose, fill] of [[ghost, "#ffffff"], [robot, ROBOT], [player, PLAYER]]) {
    ctx.beginPath();
    ctx.arc(...project(frame, pose.x, pose.y), 4, 0, 2 * Math.PI);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx in CSS pixels
 * @param {DriveScene} scene
 */
export function drawDrive(ctx, scene) {
  const { width, height, player, ahead } = scene;
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, 0, width, height);
  const zoom = (0.7 * height) / ahead;
  ctx.save();
  ctx.translate(width / 2, 0.75 * height);
  ctx.scale(zoom, -zoom);
  ctx.rotate(Math.PI / 2 - player.heading);
  ctx.translate(-player.x, -player.y);
  asphalt(ctx, scene.track, 1 / zoom);
  start(ctx, scene.track);
  boards(ctx, scene);
  line(ctx, scene);
  car(ctx, scene.ghost, GHOST, 1 / zoom);
  car(ctx, scene.robot, "#e8e8cd", 1 / zoom);
  car(ctx, player, PLAYER, 1 / zoom);
  ctx.restore();
  map(ctx, scene);
}
