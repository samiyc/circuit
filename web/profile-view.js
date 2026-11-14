import { speedColour } from "../src/view/colours.js";

/**
 * The lap along its length (J3): above, the speed of both lines in km/h (A in the colour of its speed, B dark); below,
 * the time B has lost on A at each point. The distance is the centre line's, the same axis for every line. A window
 * of points shows one corner. It only draws, and turns a click into a point.
 * @typedef {import("../src/view/lap.js").Lap} Lap
 * @typedef {{ a: Lap, b: Lap, gap: Float64Array, distance: Float64Array, from: number, to: number, index: number, low: number, high: number, width: number, height: number }} ProfileScene
 */

const PAD = { left: 46, right: 10, top: 10, bottom: 22 };
const INK = "#2f2f00";
const GRID = "rgb(95 95 0 / 0.18)";

/** The plot's frame: the speed band on top, the gap band under it. */
function layout({ width, height }) {
  const inner = height - PAD.top - PAD.bottom;
  const speed = { top: PAD.top, bottom: PAD.top + inner * 0.68 };
  const gap = { top: speed.bottom + 14, bottom: height - PAD.bottom };
  return { speed, gap, left: PAD.left, right: width - PAD.right };
}

/** The x of point i in the window. */
const xOf = (scene, box, i) => box.left + ((scene.distance[i] - scene.distance[scene.from]) / Math.max(1e-9, scene.distance[scene.to] - scene.distance[scene.from])) * (box.right - box.left);

/** The step of a grid for a span: the first of [above, step] the span exceeds, else `smallest`. */
function stepFor(span, steps, smallest) {
  for (const [above, step] of steps) if (span > above) return step;
  return smallest;
}

/**
 * A curve over the window, its y from `value(i)`; the colour from `colour(i)` if given, one per step.
 * @param {CanvasRenderingContext2D} ctx
 * @param {ProfileScene} scene
 * @param {ReturnType<typeof layout>} box
 * @param {{ value: (i: number) => number, colour?: (i: number) => string }} spec
 */
function curve(ctx, scene, box, { value, colour }) {
  ctx.lineWidth = colour ? 2.2 : 1.4;
  ctx.strokeStyle = INK;
  if (!colour) ctx.beginPath();
  for (let i = scene.from; i < scene.to; i += 1) {
    if (colour) {
      ctx.beginPath();
      ctx.strokeStyle = colour(i);
      ctx.moveTo(xOf(scene, box, i), value(i));
    }
    ctx.lineTo(xOf(scene, box, i + 1), value(i + 1));
    if (colour) ctx.stroke();
  }
  if (!colour) ctx.stroke();
}

/** Horizontal lines and their labels at every `step` from `low` to `high`, in a band. */
function grid(ctx, box, band, { low, high, step, label, skipLow = false }) {
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = INK;
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  for (let v = Math.ceil(low / step) * step + (skipLow ? step : 0); v <= high + 1e-9; v += step) {
    const y = band.bottom - ((v - low) / (high - low)) * (band.bottom - band.top);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    ctx.fillText(label(v), 4, y + 4);
  }
}

/** The speed band, km/h. */
function drawSpeeds(ctx, scene, box) {
  const band = box.speed;
  const [low, high] = [0, Math.ceil((scene.high * 3.6) / 50) * 50];
  const y = (v) => band.bottom - ((v * 3.6 - low) / (high - low)) * (band.bottom - band.top);
  grid(ctx, box, band, { low, high, step: 50, label: (v) => `${v}`, skipLow: true });
  const b = scene.b.profile.speed;
  const a = scene.a.profile.speed;
  curve(ctx, scene, box, { value: (i) => y(b[i % b.length]) });
  curve(ctx, scene, box, { value: (i) => y(a[i % a.length]), colour: (i) => speedColour(a[i], scene.low, scene.high) });
}

/** The gap band, s: B's loss on A, from zero. */
function drawGap(ctx, scene, box) {
  const band = box.gap;
  let low = Infinity;
  let high = -Infinity;
  for (let i = scene.from; i <= scene.to; i += 1) {
    low = Math.min(low, scene.gap[i]);
    high = Math.max(high, scene.gap[i]);
  }
  const span = Math.max(high - low, 0.05);
  const step = stepFor(span, [[2, 1], [0.8, 0.2], [0.25, 0.1]], 0.05);
  [low, high] = [Math.floor(low / step) * step, Math.ceil(high / step) * step + (high === low ? step : 0)];
  grid(ctx, box, band, { low, high, step, label: (v) => `${v.toFixed(step < 0.1 ? 2 : 1).replace(".", ",")} s` });
  curve(ctx, scene, box, { value: (i) => band.bottom - ((scene.gap[i] - low) / (high - low)) * (band.bottom - band.top) });
}

/** The distance under the plot, km, and the cursor at the ghost. */
function drawAxis(ctx, scene, box) {
  const span = scene.distance[scene.to] - scene.distance[scene.from];
  const step = stepFor(span, [[3000, 1000], [600, 200]], 50);
  ctx.fillStyle = INK;
  for (let d = Math.ceil(scene.distance[scene.from] / step) * step; d <= scene.distance[scene.to]; d += step) {
    const x = box.left + ((d - scene.distance[scene.from]) / span) * (box.right - box.left);
    ctx.fillText(step >= 1000 ? `${d / 1000} km` : `${d} m`, x - 12, scene.height - 6);
  }
  if (scene.index < scene.from || scene.index > scene.to) return;
  const x = xOf(scene, box, scene.index);
  ctx.strokeStyle = INK;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x, box.speed.top);
  ctx.lineTo(x, box.gap.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ProfileScene} scene
 */
export function drawProfile(ctx, scene) {
  ctx.clearRect(0, 0, scene.width, scene.height);
  const box = layout(scene);
  drawSpeeds(ctx, scene, box);
  drawGap(ctx, scene, box);
  drawAxis(ctx, scene, box);
}

/**
 * The point under a click at `px` pixels from the canvas's left.
 * @param {ProfileScene} scene
 * @param {number} px
 * @returns {number}
 */
export function pointAt(scene, px) {
  const box = layout(scene);
  const share = Math.min(1, Math.max(0, (px - box.left) / (box.right - box.left)));
  const wanted = scene.distance[scene.from] + share * (scene.distance[scene.to] - scene.distance[scene.from]);
  let i = scene.from;
  while (i < scene.to && scene.distance[i + 1] <= wanted) i += 1;
  return i;
}
