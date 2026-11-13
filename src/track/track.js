/**
 * The track: TU Munich's CSV format (racetrack-database, `x_m, y_m, w_tr_right_m, w_tr_left_m`, comment lines starting
 * with `#`), and the unit left normals along which a line is offset. Pure: it takes the file's text, the script reads it.
 * @typedef {import("../types.js").RawTrack} RawTrack
 * @typedef {import("../types.js").Track} Track
 */

/**
 * The numeric rows of a TUM CSV file, comments and blank lines skipped.
 * @param {string} text
 * @returns {number[][]}
 */
export function parseCsvRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split(",").map(Number));
}

/**
 * A track file of the database.
 * @param {string} text
 * @returns {RawTrack}
 */
export function parseTrack(text) {
  const rows = parseCsvRows(text);
  if (rows.some((row) => row.length !== 4 || row.some((value) => !Number.isFinite(value)))) {
    throw new Error("a track row has four numbers: x_m, y_m, w_tr_right_m, w_tr_left_m");
  }
  const column = (index) => Float64Array.from(rows, (row) => row[index]);
  return { x: column(0), y: column(1), wRight: column(2), wLeft: column(3) };
}

/**
 * A race line file of the database: its points only.
 * @param {string} text
 * @returns {{ x: Float64Array, y: Float64Array }}
 */
export function parseRaceline(text) {
  const rows = parseCsvRows(text);
  return { x: Float64Array.from(rows, (row) => row[0]), y: Float64Array.from(rows, (row) => row[1]) };
}

/**
 * The track with its unit left normals, from the central difference of the closed centre line.
 * @param {RawTrack} raw
 * @returns {Track}
 */
export function createTrack(raw) {
  const count = raw.x.length;
  if (count < 3) throw new Error("a closed track has three points at least");
  const nx = new Float64Array(count);
  const ny = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    const previous = (i + count - 1) % count;
    const tx = raw.x[next] - raw.x[previous];
    const ty = raw.y[next] - raw.y[previous];
    const norm = Math.hypot(tx, ty);
    nx[i] = -ty / norm;
    ny[i] = tx / norm;
  }
  return { ...raw, count, nx, ny };
}

/**
 * Every n-th point of a track, for a coarser line (n = 1 is the track itself).
 * @param {RawTrack} raw
 * @param {number} every
 * @returns {RawTrack}
 */
export function decimate(raw, every) {
  const keep = (values) => values.filter((_, i) => i % every === 0);
  return { x: keep(raw.x), y: keep(raw.y), wRight: keep(raw.wRight), wLeft: keep(raw.wLeft) };
}
