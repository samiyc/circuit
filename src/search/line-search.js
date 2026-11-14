import { createCmaes } from "mcts-commun/cmaes.js";
import { createClimb } from "mcts-commun/climb.js";
import { createRng } from "mcts-commun/random.js";

/**
 * The two searches of P2 (docs/recherche/pistes.md) over a line of genes, at an equal budget of lines scored, from the
 * same start: CMA-ES of the library, and its hill climb moving a block of neighbouring genes. Each returns its best
 * genes, their lap time, and the best lap time after every `every` lines scored (the curve of the measure). Seeded:
 * a run replays from its seed.
 * @typedef {ReturnType<typeof import("./line-score.js").createLineScore>} LineScore
 * @typedef {{ genes: Float64Array, time: number, evaluations: number, curve: number[] }} SearchResult
 */

/**
 * The best lap time so far, sampled every `every` lines scored.
 * @param {number} every
 */
function createCurve(every) {
  const curve = [];
  let best = Infinity;
  let seen = 0;
  return {
    curve,
    /** @param {number} time */
    add(time) {
      best = Math.min(best, time);
      seen += 1;
      if (seen % every === 0) curve.push(best);
    },
  };
}

/**
 * CMA-ES from `start`, a first step `sigma` (0.3 of the mean half room by default, docs/recherche/pistes.md, P2).
 * @param {LineScore} scorer
 * @param {{ start: Float64Array, budget: number, seed: number, sigma?: number, every?: number }} options
 * @returns {SearchResult}
 */
export function searchCmaes(scorer, { start, budget, seed, sigma = 0.3, every = 1000 }) {
  const strategy = createCmaes({ genes: start.length, mean: start, sigma, seed });
  const trace = createCurve(every);
  const scores = new Float64Array(strategy.population);
  const startTime = scorer.time(start);
  trace.add(startTime);
  let best = { genes: Float64Array.from(start), time: startTime };
  let evaluations = 1;
  while (evaluations + strategy.population <= budget && strategy.sigma > 1e-12) {
    const plans = strategy.ask();
    for (let k = 0; k < plans.length; k += 1) {
      const time = scorer.time(plans[k]);
      scores[k] = -time;
      trace.add(time);
      if (time < best.time) best = { genes: Float64Array.from(plans[k]), time };
    }
    strategy.tell(scores);
    evaluations += plans.length;
  }
  return { ...best, evaluations, curve: trace.curve };
}

/**
 * The climb's moves: a block of 1 to `block` neighbouring genes (a bend is several genes), each moved by a normal
 * draw of `sigma` times the amplitude, which shrinks from 1 to 0.1 over the budget.
 * @param {Float64Array} start
 * @param {LineScore} scorer
 * @param {{ sigma: number, block: number, trace: ReturnType<typeof createCurve> }} settings
 */
function climbProblem(start, scorer, { sigma, block, trace }) {
  return {
    start: (plan) => plan.set(start),
    score(plan) {
      const time = scorer.time(plan);
      trace.add(time);
      return -time;
    },
    mutate(child, best, amplitude, rng) {
      child.set(best);
      const length = 1 + rng.int(block);
      const from = rng.int(child.length);
      for (let k = 0; k < length; k += 1) {
        const at = (from + k) % child.length;
        child[at] += sigma * amplitude * rng.normal();
      }
    },
    fresh: (plan, _rng) => plan.set(start),
  };
}

/**
 * The hill climb of the library from `start`, never a fresh plan (a random line is far worse than any best).
 * @param {LineScore} scorer
 * @param {{ start: Float64Array, budget: number, seed: number, sigma?: number, block?: number, every?: number }} options
 * @returns {SearchResult}
 */
export function searchClimb(scorer, { start, budget, seed, sigma = 0.3, block = 3, every = 1000 }) {
  const trace = createCurve(every);
  const climber = createClimb({ genes: start.length });
  const result = climber.run(climbProblem(start, scorer, { sigma, block, trace }), { budget, rng: createRng(seed), freshEvery: Infinity });
  return { genes: Float64Array.from(result.plan), time: -result.score, evaluations: result.evaluations, curve: trace.curve };
}
