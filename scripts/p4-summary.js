import { readdirSync, readFileSync } from "node:fs";
import { paired } from "mcts-commun/measure.js";

/**
 * `node scripts/p4-summary.js`: the measures of scripts/p4.js (docs/ligne-cmaes.md, § 8). Each method's mean gain on
 * the minimum curvature, and the pairs that decide, on the same track and seed: the descent against the search at
 * 100 000 lap times, and the search then the descent against the search alone at 200 000.
 */
const rows = readdirSync("tmp/p4")
  .filter((file) => file.endsWith(".jsonl"))
  .flatMap((file) => readFileSync(`tmp/p4/${file}`, "utf8").trim().split("\n").map((line) => JSON.parse(line)));
const reference = new Map(rows.filter((row) => !row.method).map((row) => [row.track, row.minCurvature]));
const decimal = (value, digits = 2) => value.toFixed(digits).replace(".", ",");

/** The descent's best time within `budget` lap times, from its curve. */
function descentAt(row, budget) {
  const within = row.curve.filter(([spent]) => spent <= budget);
  return within.length ? within[within.length - 1][1] : reference.get(row.track);
}

/** The runs of a method by `track|seed`; the descent, which draws nothing, stands for every seed. */
function byPair(method, budget) {
  const seeds = rows.filter((row) => row.method === "coarse").map((row) => row.seed);
  const out = new Map();
  for (const row of rows.filter((r) => r.method === method)) {
    const time = method === "descent" ? descentAt(row, budget) : row.time;
    for (const seed of method === "descent" ? new Set(seeds) : [row.seed]) out.set(`${row.track}|${seed}`, { track: row.track, time, seconds: row.seconds });
  }
  return out;
}

const methods = {
  "la descente, 100 000": byPair("descent", 100000),
  "la descente, 300 000": byPair("descent", 300000),
  "40 → 20 → 10, 100 000": byPair("coarse100k"),
  "40 → 20 → 10, 200 000": byPair("coarse"),
  "40 → 20 → 10 (100 000), puis la descente (100 000)": byPair("polish"),
};
console.log(`${reference.size} piste(s)\n`);
console.log("| Méthode | Paires | Gain moyen (s) | Le moins / le plus (s) |");
console.log("|---|---|---|---|");
for (const [name, runs] of Object.entries(methods)) {
  const gains = [...runs.values()].map((run) => reference.get(run.track) - run.time);
  const mean = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
  console.log(`| ${name} | ${gains.length} | ${decimal(mean)} | ${decimal(Math.min(...gains))} / ${decimal(Math.max(...gains))} |`);
}

/** Two methods by pairs: positive when the first is faster. */
function versus(first, second) {
  const mine = methods[first];
  const theirs = methods[second];
  const pairs = [...mine.keys()].filter((pair) => theirs.has(pair));
  const result = paired(
    pairs.map((pair) => -mine.get(pair).time),
    pairs.map((pair) => -theirs.get(pair).time),
  );
  return `| ${first} contre ${second} | ${pairs.length} | ${decimal(result.mean)} [${decimal(result.low)} ; ${decimal(result.high)}] | ${result.wins}/${result.losses} |`;
}

console.log("\n| Comparaison | Paires | Écart (s, IC 95 %) | gagne / perd |");
console.log("|---|---|---|---|");
console.log(versus("la descente, 100 000", "40 → 20 → 10, 100 000"));
console.log(versus("40 → 20 → 10 (100 000), puis la descente (100 000)", "40 → 20 → 10, 200 000"));
console.log(versus("40 → 20 → 10, 200 000", "40 → 20 → 10, 100 000"));
const seconds = (method) => rows.filter((row) => row.method === method).reduce((sum, row, _, all) => sum + row.seconds / all.length, 0);
console.log(`\nCalcul moyen (s) : la descente à 300 000 ${decimal(seconds("descent"), 1)}, 40 → 20 → 10 à 200 000 ${decimal(seconds("coarse"), 1)}, la finition ${decimal(seconds("polish"), 1)}`);
