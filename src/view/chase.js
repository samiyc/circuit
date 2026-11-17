/**
 * The view from behind the car (P9, the "front" view decided on 13/11: the car seen from behind, to drive): a pinhole
 * camera `back` metres behind the car and `height` metres up, looking along the camera's heading. Pure: a point of the
 * world to the camera, the camera to the screen; the page draws.
 * @typedef {{ x: number, y: number, heading: number }} Pose
 * @typedef {{ depth: number, left: number }} Seen m ahead of the camera, m to its left
 */

/** The camera: m behind and above the car, the horizon's share of the height, the focal over the width, m kept. */
export const CHASE = Object.freeze({ back: 9, height: 3.2, horizon: 0.36, focal: 0.9, near: 1, far: 450 });

/**
 * A point of the world as the camera behind `pose` sees it.
 * @param {Pose} pose the camera's: the car's position, and the heading it looks along
 * @param {number} x m
 * @param {number} y m
 * @returns {Seen}
 */
export function toChase({ x: carX, y: carY, heading }, x, y) {
  const [cos, sin] = [Math.cos(heading), Math.sin(heading)];
  const dx = x - (carX - cos * CHASE.back);
  const dy = y - (carY - sin * CHASE.back);
  return { depth: dx * cos + dy * sin, left: -dx * sin + dy * cos };
}

/**
 * A seen point on the screen, at `up` metres above the road; its scale, pixels a metre there. Null nearer than
 * CHASE.near (behind the lens).
 * @param {Seen} seen
 * @param {number} width px
 * @param {number} height px
 * @param {number} [up] m
 * @returns {{ x: number, y: number, scale: number } | null}
 */
export function chaseScreen({ depth, left }, width, height, up = 0) {
  if (depth < CHASE.near) return null;
  const scale = (CHASE.focal * width) / depth;
  return { x: width / 2 - scale * left, y: CHASE.horizon * height + scale * (CHASE.height - up), scale };
}
