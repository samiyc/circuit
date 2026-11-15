/**
 * The lateral tyre of the car that slips (J4, docs/pilote.md § 2): the share of the peak lateral grip a tyre gives at
 * a slip angle, μ / μmax = sin(Q·atan(S·α / α̂)), the shape of Perantoni and Limebeer's F1 tyre (Vehicle System
 * Dynamics 52(5), 2014, appendix A and table 3). It rises, peaks at the peak slip α̂, then falls towards sin(Q·π/2):
 * past the peak, more slip gives less grip, and the car spins. The peak grip itself is the TUM F1's (src/car.js).
 */

const DEGREE = Math.PI / 180;

/** Perantoni and Limebeer 2014, table 3: the peak slip at two tyre loads, and the shape factor. */
export const PL_TYRE = Object.freeze({
  load1: 2000, // N
  load2: 6000, // N
  peakSlip1: 9 * DEGREE, // rad, at load 1
  peakSlip2: 8 * DEGREE, // rad, at load 2
  shape: 1.9, // Q
});

/**
 * The slip angle of the peak at this tyre load, interpolated between the table's two loads and held outside them.
 * @param {typeof PL_TYRE} tyre
 * @param {number} load N, one tyre
 * @returns {number} rad
 */
export function peakSlip(tyre, load) {
  const share = Math.min(1, Math.max(0, (load - tyre.load1) / (tyre.load2 - tyre.load1)));
  return tyre.peakSlip1 + share * (tyre.peakSlip2 - tyre.peakSlip1);
}

/**
 * The share of the peak lateral grip at a slip angle, signed as the slip, 1 at the peak slip. S puts the peak there:
 * Q·atan(S) = π/2.
 * @param {typeof PL_TYRE} tyre
 * @param {number} slip rad
 * @param {number} load N, one tyre
 * @returns {number}
 */
export function lateralShare(tyre, slip, load) {
  const stretch = Math.tan(Math.PI / (2 * tyre.shape));
  return Math.sin(tyre.shape * Math.atan((stretch * slip) / peakSlip(tyre, load)));
}
