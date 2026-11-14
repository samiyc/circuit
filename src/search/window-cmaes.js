import { createCmaes } from "mcts-commun/cmaes.js";

/**
 * CMA-ES on a window of neighbouring genes at a time (docs/ligne-cmaes.md, § 4): the size where the library measured
 * it at its best (6 to 50 genes), on a line where a gene acts on its neighbours only. The windows slide round the
 * track by `stride` genes; each runs `chunk` lines from the best line so far, its step shrinking from `sigma` to a
 * tenth over the budget, as the climb's amplitude. Seeded: each window's strategy draws from `seed` and its rank.
 * @typedef {ReturnType<typeof import("./line-score.js").createLineScore>} LineScore
 * @typedef {import("./line-search.js").SearchResult} SearchResult
 */

/** Scores one plan of the window into the whole line; the best line takes it if faster. @returns {number} its time */
function tryPlan(scorer, state, from, plan) {
  const { best, trial, curve, every } = state;
  const n = trial.length;
  trial.set(best.genes);
  for (let k = 0; k < plan.length; k += 1) trial[(from + k) % n] = plan[k];
  const time = scorer.time(trial);
  if (time < best.time) {
    best.time = time;
    best.genes.set(trial);
  }
  state.seen += 1;
  if (state.seen % every === 0) curve.push(best.time);
  return time;
}

/**
 * One window: CMA-ES over `width` genes from `from`, the others held at the best line's.
 * @returns {number} the lines scored
 */
function runWindow(scorer, state, { from, width, chunk, sigma, seed }) {
  const n = state.best.genes.length;
  const mean = Float64Array.from({ length: width }, (_, k) => state.best.genes[(from + k) % n]);
  const strategy = createCmaes({ genes: width, mean, sigma, seed });
  const scores = new Float64Array(strategy.population);
  let used = 0;
  while (used + strategy.population <= chunk) {
    const plans = strategy.ask();
    for (let p = 0; p < plans.length; p += 1) scores[p] = -tryPlan(scorer, state, from, plans[p]);
    strategy.tell(scores);
    used += plans.length;
  }
  return used;
}

/**
 * @param {LineScore} scorer
 * @param {{ start: Float64Array, budget: number, seed: number, sigma?: number, width?: number, stride?: number, chunk?: number, every?: number }} options
 * @returns {SearchResult}
 */
export function searchWindowCmaes(scorer, { start, budget, seed, sigma = 0.3, width = 12, stride = 6, chunk = 400, every = 1000 }) {
  const state = { best: { genes: Float64Array.from(start), time: scorer.time(start) }, trial: new Float64Array(start.length), curve: [], every, seen: 1 };
  let evaluations = 1;
  let rank = 0;
  while (evaluations + chunk <= budget) {
    const step = sigma * Math.max(0.1, 1 - evaluations / budget);
    const from = (rank * stride) % start.length;
    evaluations += runWindow(scorer, state, { from, width: Math.min(width, start.length), chunk, sigma: step, seed: seed * 100003 + rank });
    rank += 1;
  }
  return { genes: state.best.genes, time: state.best.time, evaluations, curve: state.curve };
}
