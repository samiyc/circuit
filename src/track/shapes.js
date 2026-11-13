/**
 * Tracks drawn by hand, the textbook cases where the right answer is known (docs/recherche/bancs.md, § 4): a ring, where
 * the speed is constant; a stadium (two straights, two half circles), where a tight radius brakes and a wide one is
 * taken flat out, and whose half turns are taken on the outside edge; a rounded square, whose quarter turns are taken
 * outside, apex, outside. Driven anticlockwise: the left normal points into the bends.
 * @typedef {import("../types.js").RawTrack} RawTrack
 */

/**
 * A ring of `count` points on a circle of radius `radius`, `width` wide in all.
 * @param {number} radius m
 * @param {number} count
 * @param {number} width m
 * @returns {RawTrack}
 */
export function ring(radius, count, width) {
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const angle = (2 * Math.PI * i) / count;
    x[i] = radius * Math.cos(angle);
    y[i] = radius * Math.sin(angle);
  }
  return withWidth(x, y, width);
}

/**
 * A regular polygon of `sides` straights of `straight` metres joined by arcs of radius `radius`, sampled about every
 * `spacing` metres, from the start of the first straight, heading along +x.
 * @param {{ sides: number, straight: number, radius: number, spacing: number, width: number }} shape
 * @returns {RawTrack}
 */
export function roundedPolygon({ sides, straight, radius, spacing, width }) {
  const turn = (2 * Math.PI) / sides;
  const straightSteps = Math.max(1, Math.round(straight / spacing));
  const arcSteps = Math.max(2, Math.round((turn * radius) / spacing));
  const points = [];
  let start = [0, 0];
  for (let side = 0; side < sides; side += 1) {
    const heading = side * turn;
    const [px, py] = start;
    for (let i = 0; i < straightSteps; i += 1) {
      const along = (straight * i) / straightSteps;
      points.push([px + along * Math.cos(heading), py + along * Math.sin(heading)]);
    }
    const centre = [px + straight * Math.cos(heading) - radius * Math.sin(heading), py + straight * Math.sin(heading) + radius * Math.cos(heading)];
    const onArc = (angle) => [centre[0] + radius * Math.cos(angle), centre[1] + radius * Math.sin(angle)];
    for (let i = 0; i < arcSteps; i += 1) points.push(onArc(heading - Math.PI / 2 + (turn * i) / arcSteps));
    start = onArc(heading + turn - Math.PI / 2);
  }
  return withWidth(
    Float64Array.from(points, (point) => point[0]),
    Float64Array.from(points, (point) => point[1]),
    width,
  );
}

/**
 * A stadium: two straights of `straight` metres and two half circles of radius `radius`.
 * @param {{ straight: number, radius: number, spacing: number, width: number }} shape
 * @returns {RawTrack}
 */
export function stadium(shape) {
  return roundedPolygon({ ...shape, sides: 2 });
}

/** The track of these points, `width` wide in all, centred. */
function withWidth(x, y, width) {
  const half = () => new Float64Array(x.length).fill(width / 2);
  return { x, y, wRight: half(), wLeft: half() };
}
