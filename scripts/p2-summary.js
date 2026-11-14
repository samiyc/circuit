import { readdirSync, readFileSync } from "node:fs";
import { paired } from "mcts-commun/measure.js";

/**
 * `node scripts/p2-summary.js`: the measure of P2 from tmp/p2/*.jsonl. For each gene spacing, start and budget: the
 * mean gain of each search on the minimum-curvature line, and CMA-ES against the climb, paired on the same track and
 * seed, with its 95 % interval (`paired` of the library). Times in seconds, a gain positive when faster.
 */
const rows = readdirSync("tmp/p2")
  .filter((file) => file.endsWith(".jsonl"))
  .flatMap((file) => readFileSync(`tmp/p2/${file}`, "utf8").trim().split("\n").map((line) => JSON.parse(line)));
const reference = new Map(rows.filter((row) => row.method === undefined).map((row) => [row.track, row.minCurvature]));
const runs = rows.filter((row) => row.method !== undefined);
const key = (row) => `${row.spacing}|${row.start}|${row.budget}`;
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");

/** The runs of one method in one configuration, keyed by track and seed. */
function byPair(group, method) {
  return new Map(group.filter((row) => row.method === method).map((row) => [`${row.track}|${row.seed}`, row]));
}

/** One line of the table: the configuration, the mean gains, CMA-ES against the climb. */
function summarise(group) {
  const cmaes = byPair(group, "cmaes");
  const climb = byPair(group, "climb");
  const pairs = [...cmaes.keys()].filter((pair) => climb.has(pair));
  const gain = (map) => pairs.reduce((sum, pair) => sum + reference.get(map.get(pair).track) - map.get(pair).time, 0) / pairs.length;
  const versus = paired(
    pairs.map((pair) => -cmaes.get(pair).time),
    pairs.map((pair) => -climb.get(pair).time),
  );
  const seconds = (map) => pairs.reduce((sum, pair) => sum + map.get(pair).seconds, 0) / pairs.length;
  const [spacing, start, budget] = key(group[0]).split("|");
  const interval = `${decimal(versus.mean)} [${decimal(versus.low)} ; ${decimal(versus.high)}]`;
  return `| ${spacing} m | ${start} | ${budget} | ${pairs.length} | ${decimal(gain(cmaes))} | ${decimal(gain(climb))} | ${interval} | ${versus.wins}/${versus.losses} | ${decimal(seconds(cmaes), 1)} / ${decimal(seconds(climb), 1)} |`;
}

const groups = new Map();
for (const row of runs) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
console.log(`${reference.size} piste(s), ${runs.length} recherches\n`);
console.log("| Pas | Départ | Budget | Paires | Gain CMA-ES (s) | Gain escalade (s) | CMA-ES − escalade (s, IC 95 %) | CMA-ES gagne / perd | Calcul (s) CMA-ES / escalade |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const group of [...groups.values()].sort((a, b) => key(a[0]).localeCompare(key(b[0]), "fr", { numeric: true }))) console.log(summarise(group));
