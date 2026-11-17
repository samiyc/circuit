/**
 * The shapes the modules hand each other, in JSDoc (`npm run types`). A module points here with
 * `@typedef {import("./types.js").Name} Name`. The model is in docs/modele.md.
 */

/**
 * The points of a line, in metres.
 * @typedef {{ x: Float64Array, y: Float64Array }} Points
 */

/**
 * A closed track as TU Munich's racetrack-database gives it: the centre line and the free width on each side, in
 * metres, one entry a point, the last point joined to the first.
 * @typedef {object} RawTrack
 * @property {Float64Array} x
 * @property {Float64Array} y
 * @property {Float64Array} wRight the free width to the right of the driving direction
 * @property {Float64Array} wLeft the free width to its left
 */

/**
 * A track ready for lines: a line is an offset along each point's unit left normal (nx, ny).
 * @typedef {RawTrack & { count: number, nx: Float64Array, ny: Float64Array }} Track
 */

/**
 * The bounds of a line's offsets, in metres along the left normal: the track's edges less half the car's width.
 * @typedef {object} Bounds
 * @property {Float64Array} lower
 * @property {Float64Array} upper
 */

/**
 * A point-mass car under a friction ellipse whose normal load grows with downforce (docs/modele.md, § 2). Forces in
 * newtons, speeds in m/s.
 * @typedef {object} Car
 * @property {number} mass kg
 * @property {number} gravity m/s²
 * @property {number} muX the longitudinal friction coefficient at the nominal tyre load, braking on four wheels
 * @property {number} muY the lateral one
 * @property {number} driveMu the traction coefficient, the driven axle's muX times its share of the load
 * @property {number} loadSensitivity dμ/dFz per tyre, 1/N (≤ 0: grip drops as the load grows)
 * @property {number} nominalLoad Fz0, the tyre load at which muX and muY hold, N
 * @property {number} downforce ½·ρ·cz·A, N per (m/s)²
 * @property {number} drag ½·ρ·cw·A, N per (m/s)²
 * @property {number} rolling the rolling resistance coefficient, a share of the normal load
 * @property {number} power the power at the wheels, W
 * @property {number} boostPower the extra power above `boostSpeed` (the electric motor), W
 * @property {number} boostSpeed m/s
 * @property {number} topSpeed where drive meets resistance on a straight, m/s (derived by `createCar`)
 * @property {Surface} [surface] the road it drives on (P8, the rain), dry without one
 */

/**
 * The road's grip (P8, docs/pluie.md): `wet` scales every force the tyres give, everywhere; on a band around `line`
 * (the dry line, as many points as the lines it scores), the grip drops by `drop` more at the line, smoothly to
 * nothing `half` metres away from it.
 * @typedef {object} Surface
 * @property {number} wet a share of the dry grip, 1 dry
 * @property {Points} [line] the dry line, where the rubber and the polished asphalt are
 * @property {number} [half] m, the band's half-width
 * @property {number} [drop] a share of the grip lost at the line
 */

/**
 * The buffers of a speed profile, allocated once for a line of `count` points (the scoring does not allocate).
 * @typedef {object} Profile
 * @property {number} count
 * @property {Float64Array} step the distance from point i to point i + 1, m
 * @property {Float64Array} curvature the signed curvature at point i, 1/m (positive to the left)
 * @property {Float64Array} limit the cornering speed at point i, m/s
 * @property {Float64Array} speed the profile, m/s
 * @property {Float64Array} grip the road's at point i, a share of the dry (src/profile/surface.js)
 */

export {};
