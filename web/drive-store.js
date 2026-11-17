/**
 * What the drive page keeps in this browser, a convenience: the choices of its menus, and the best clean lap per track,
 * line and weather. Without storage (a private window, blocked site data), the defaults, and the best lap lasts the page.
 */

/**
 * A menu whose choice is kept.
 * @param {HTMLSelectElement} select
 * @param {() => void} after on each change, once kept
 */
export function remember(select, after) {
  try {
    const kept = localStorage.getItem(`circuit.${select.id}`);
    if (kept && [...select.options].some((option) => option.value === kept)) select.value = kept;
  } catch {
    /* no storage */
  }
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(`circuit.${select.id}`, select.value);
    } catch {
      /* no storage */
    }
    after();
  });
}

/**
 * The best lap's key: the dry road keeps the key of the laps driven before the rain (0.8.0), the F1 the key of the laps
 * driven before the other cars (0.9.0).
 * @param {string} track
 * @param {string} line
 * @param {string} weather
 * @param {string} [car]
 */
export function bestKey(track, line, weather, car = "f1") {
  const base = `circuit.best.${track}.${line}${car === "f1" ? "" : "." + car}`;
  return weather === "dry" ? base : `${base}.${weather}`;
}

/** @param {string} key @returns {number} s, Infinity without one */
export function readBest(key) {
  try {
    return Number(localStorage.getItem(key)) || Infinity;
  } catch {
    return Infinity;
  }
}

/** @param {string} key @param {number} time s */
export function keepBest(key, time) {
  try {
    if (time < readBest(key)) localStorage.setItem(key, String(time));
  } catch {
    /* no storage: the best lap lasts the page */
  }
}
