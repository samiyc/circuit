import { speedColour } from "../src/view/colours.js";
import { CHASE, chaseScreen, toChase } from "../src/view/chase.js";

/**
 * The drive seen from behind the car (P9): the road ahead to CHASE.far metres, its edges, the line in the colours of
 * its speed, the braking boards, the ghost and the driver's car, and Sami's car from behind. The projection is
 * src/view/chase.js; this only draws, far to near.
 * @typedef {import("./drive-view.js").DriveScene} DriveScene
 */

const SKY = "#dfe3c8";
const GRASS = "#9bab6e";
const ASPHALT = "#a3a18a";
const EDGE = "#ffffff";
const DARK = "#2f2f00";
const PLAYER = "#c23b22";
/** m, a board's height and width; its stripes, one per 50 m. */
const BOARD = { height: 2.2, width: 1.6, verge: 3 };

/** The track's sections from a few behind Sami's point to CHASE.far ahead, as indices. */
function sectionsAhead({ track, line }, from) {
  const indices = [];
  let walked = 0;
  for (let k = -4; k < track.count && walked < CHASE.far; k += 1) {
    const i = (from + k + track.count) % track.count;
    indices.push(i);
    if (k >= 0) walked += line.profile.step[i];
  }
  return indices;
}

/** A point of the world on the screen, or null behind the lens. */
function screenOf(scene, camera, x, y) {
  return chaseScreen(toChase(camera, x, y), scene.width, scene.height);
}

/** The road, quad by quad from far to near, and its white edges. */
function road(ctx, scene, camera, indices) {
  const { track } = scene;
  const edge = (i, side) => {
    const w = side > 0 ? track.wLeft[i] : -track.wRight[i];
    return screenOf(scene, camera, track.x[i] + track.nx[i] * w, track.y[i] + track.ny[i] * w);
  };
  for (let k = indices.length - 2; k >= 0; k -= 1) {
    const [a, b] = [indices[k], indices[k + 1]];
    const corners = [edge(a, 1), edge(b, 1), edge(b, -1), edge(a, -1)];
    if (corners.some((c) => !c)) continue;
    ctx.beginPath();
    for (const c of corners) ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fillStyle = ASPHALT;
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, 0.25 * corners[0].scale);
    for (const [from, to] of [[corners[0], corners[1]], [corners[3], corners[2]]]) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }
}

/** The line, 35 cm wide, in the colours of its speed. */
function line(ctx, scene, camera, indices) {
  const { line: lap, low, high } = scene;
  for (let k = indices.length - 2; k >= 0; k -= 1) {
    const [a, b] = [indices[k], indices[k + 1]];
    const [from, to] = [screenOf(scene, camera, lap.x[a], lap.y[a]), screenOf(scene, camera, lap.x[b], lap.y[b])];
    if (!from || !to) continue;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = speedColour(lap.profile.speed[a], low, high);
    ctx.lineWidth = Math.max(1, 0.35 * to.scale);
    ctx.stroke();
  }
}

/** A board on its verge: white, a dark stripe per 50 m. */
function board(ctx, base, stripes) {
  const [w, h] = [BOARD.width * base.scale, BOARD.height * base.scale];
  ctx.fillStyle = EDGE;
  ctx.fillRect(base.x - w / 2, base.y - h, w, h);
  ctx.fillStyle = DARK;
  for (let s = 0; s < stripes; s += 1) ctx.fillRect(base.x - w / 2, base.y - h + (s + 0.5) * (h / 4), w, h / 8);
}

/** A car from behind: its body, its wheels and its rear wing. */
function carBack(ctx, base, fill) {
  const m = base.scale;
  ctx.fillStyle = DARK;
  for (const side of [-1, 1]) ctx.fillRect(base.x + side * 0.75 * m - 0.22 * m, base.y - 0.65 * m, 0.45 * m, 0.65 * m);
  ctx.fillStyle = fill;
  ctx.fillRect(base.x - 0.5 * m, base.y - 0.75 * m, 1 * m, 0.6 * m);
  ctx.fillRect(base.x - 0.5 * m, base.y - 1 * m, 1 * m, 0.12 * m);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = Math.max(1, 0.04 * m);
  ctx.strokeRect(base.x - 0.5 * m, base.y - 0.75 * m, 1 * m, 0.6 * m);
}

/** The boards and the cars, far to near. */
function things(ctx, scene, camera, ahead) {
  const { track } = scene;
  const items = scene.boards
    .filter((b) => ahead.has(b.index))
    .map((b) => {
      const w = b.side > 0 ? track.wLeft[b.index] + BOARD.verge : -(track.wRight[b.index] + BOARD.verge);
      const [x, y] = [track.x[b.index] + track.nx[b.index] * w, track.y[b.index] + track.ny[b.index] * w];
      return { seen: toChase(camera, x, y), draw: (base) => board(ctx, base, b.distance / 50) };
    });
  for (const [pose, fill] of [[scene.ghost, "rgb(244 244 228 / 0.7)"], [scene.robot, "#e8e8cd"], [scene.player, PLAYER]]) {
    items.push({ seen: toChase(camera, pose.x, pose.y), draw: (base) => carBack(ctx, base, fill) });
  }
  items.sort((a, b) => b.seen.depth - a.seen.depth);
  for (const item of items) {
    const base = chaseScreen(item.seen, scene.width, scene.height);
    if (base && item.seen.depth < CHASE.far) item.draw(base);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx in CSS pixels
 * @param {DriveScene & { camera: { x: number, y: number, heading: number }, index: number }} scene the camera: on
 *   Sami's car, its heading smoothed; index: his point of the track
 */
export function drawChase(ctx, scene) {
  const { width, height, camera } = scene;
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, CHASE.horizon * height, width, height);
  const indices = sectionsAhead(scene, scene.index);
  road(ctx, scene, camera, indices);
  line(ctx, scene, camera, indices);
  things(ctx, scene, camera, new Set(indices));
}
