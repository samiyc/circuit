/**
 * From the track's metres to the canvas's pixels (J3): the box to show, fitted into the canvas with its aspect kept and
 * centred, north up (the canvas's y grows downwards). Pure.
 * @typedef {{ minX: number, minY: number, maxX: number, maxY: number }} Box
 * @typedef {{ scale: number, centreX: number, centreY: number, width: number, height: number }} Frame
 */

/**
 * The box around every point of the given lines.
 * @param {...{ x: ArrayLike<number>, y: ArrayLike<number> }} lines
 * @returns {Box}
 */
export function boxOf(...lines) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const { x, y } of lines) {
    for (let i = 0; i < x.length; i += 1) {
      box.minX = Math.min(box.minX, x[i]);
      box.maxX = Math.max(box.maxX, x[i]);
      box.minY = Math.min(box.minY, y[i]);
      box.maxY = Math.max(box.maxY, y[i]);
    }
  }
  return box;
}

/**
 * The square box of half side `radius` around a point, to zoom on a corner.
 * @param {number} x
 * @param {number} y
 * @param {number} radius m
 * @returns {Box}
 */
export function boxAround(x, y, radius) {
  return { minX: x - radius, minY: y - radius, maxX: x + radius, maxY: y + radius };
}

/**
 * The frame that shows the box in a canvas of `width` × `height` pixels, `margin` pixels kept on each side.
 * @param {Box} box
 * @param {number} width
 * @param {number} height
 * @param {number} [margin]
 * @returns {Frame}
 */
export function fitFrame(box, width, height, margin = 12) {
  const spanX = Math.max(box.maxX - box.minX, 1e-9);
  const spanY = Math.max(box.maxY - box.minY, 1e-9);
  const scale = Math.min((width - 2 * margin) / spanX, (height - 2 * margin) / spanY);
  return { scale, centreX: (box.minX + box.maxX) / 2, centreY: (box.minY + box.maxY) / 2, width, height };
}

/**
 * A point in pixels.
 * @param {Frame} frame
 * @param {number} x m
 * @param {number} y m
 * @returns {[number, number]}
 */
export function project({ scale, centreX, centreY, width, height }, x, y) {
  return [width / 2 + (x - centreX) * scale, height / 2 - (y - centreY) * scale];
}
