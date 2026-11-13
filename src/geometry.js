/**
 * The discrete geometry of a line of points: the step to the next point and the curvature at each point, the Menger
 * curvature of three neighbours (2·sin of the turn over the chord), exact on a circle, positive to the left. The speed
 * profile and the minimum-curvature line read the same curvature.
 */

/**
 * The signed Menger curvature at point i of a closed line, the circle through it and its two neighbours (0 when two of
 * them meet).
 * @param {Float64Array} x
 * @param {Float64Array} y
 * @param {number} i
 * @returns {number} 1/m
 */
export function curvatureAt(x, y, i) {
  const count = x.length;
  const previous = i > 0 ? i - 1 : count - 1;
  const next = i + 1 < count ? i + 1 : 0;
  const ax = x[previous];
  const ay = y[previous];
  const bx = x[i];
  const by = y[i];
  const cx = x[next];
  const cy = y[next];
  const ux = bx - ax;
  const uy = by - ay;
  const vx = cx - bx;
  const vy = cy - by;
  const wx = cx - ax;
  const wy = cy - ay;
  // Math.hypot is several times slower than a square root in V8, and the score is the hot path.
  const product = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy) * (wx * wx + wy * wy));
  return product === 0 ? 0 : (2 * (ux * vy - uy * vx)) / product;
}

/**
 * The steps and curvatures of a line, into the given buffers. Closed, the last point joins the first; open, the last
 * step is 0 and both ends are straight.
 * @param {Float64Array} x
 * @param {Float64Array} y
 * @param {boolean} closed
 * @param {{ step: Float64Array, curvature: Float64Array }} out
 */
export function measureLine(x, y, closed, { step, curvature }) {
  const count = x.length;
  for (let i = 0; i < count; i += 1) {
    const next = i + 1 < count ? i + 1 : 0;
    const dx = x[next] - x[i];
    const dy = y[next] - y[i];
    step[i] = Math.sqrt(dx * dx + dy * dy);
    curvature[i] = curvatureAt(x, y, i);
  }
  if (!closed) {
    step[count - 1] = 0;
    curvature[0] = 0;
    curvature[count - 1] = 0;
  }
}

/**
 * The length of a closed line.
 * @param {Float64Array} x
 * @param {Float64Array} y
 * @returns {number} m
 */
export function closedLength(x, y) {
  let length = 0;
  for (let i = 0; i < x.length; i += 1) {
    const next = i + 1 < x.length ? i + 1 : 0;
    length += Math.hypot(x[next] - x[i], y[next] - y[i]);
  }
  return length;
}
