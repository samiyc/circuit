# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

A car on a race track in simulation (Sami, 13/11/2026; he played Trackmania for years): a track (its centre
line and its width), a car whose tyres grip up to a limit, and every driver's question, from karting to F1 to
Trackmania: which line, which speed at each point, for the best lap time. First the ideal line, computed offline;
then a driver that follows it tick by tick, then Sami at the controls, against it. Kin to `raquette`: a physics, a
robot, a human player to test it.

Created 13/11/2026, a client of `mcts-commun` like `mcts-urgences`, `mcts-entrepot`, `raquette` and `reseau`,
siblings in `E:\Dev\My projects\`.

What is new to the projects: continuous trajectory optimisation, a line being a few tens of numbers scored by a
lap-time simulation of a few microseconds (a hypothesis until measured); the second client of `cmaes.js` after codingame's Mars Lander, where the
landscape is the smooth, slanted valley CMA-ES is made for. It takes `cmaes` and `climb` (the line), `beam` (the
driving, a plan over the next ticks, as Mad Pod Racing), `mcts-race` (the variants), `measure` and `random` from the
library. Gradient optimisation under constraints (a QP for the minimum-curvature line, later an NLP for the minimum
time) is the family no project has yet; `reseau` will need the same (the DC-OPF). No `mcts-` in the name.

**The physics is not in the library.** Pod physics live in `mcts-codingame` (`mad-pod-racing/engine`): read them,
copy what serves, never import them, never edit that repository. All the research of the framing, with its sources, is
in `docs/recherche/`: read it before deciding anything.

**Decided with Sami on 13/11** (his answers, quoted, in `docs/recherche/questions.md`): real cars on F1 and Le Mans
tracks, Trackmania's drift only as a later variant; wet roads first among the grip changes; no collisions, the other
cars are ghosts; keyboard and gamepad (accelerate Up / A, brake left Ctrl / RB, and the analog RT trigger for trail
braking, steer arrows / left stick); views from above, side and front as in raquette; the QP solver goes in the
library; TUM's tracks are downloaded by a script into a folder git ignores; no hooking into Trackmania itself. No
professional is asked for now: the racing questions are answered from the web and the papers
(`docs/recherche/questions.md` § 4). TUM's 25 tracks have no Le Mans; its `laptime-simulation` has an F1 (LGPL-3.0).

Its line in the roadmap: `mcts-commun/docs/feuille-de-route.md`, § 2.C. Start there, with `mcts-commun`'s `CLAUDE.md`,
`docs/algorithmes.md`, `docs/backlog.md` and `docs/board.md`.

## Rules

- **Prose docs are in French**, as the owner works; code, comments and identifiers are English.
- **Node 24, ES modules, no build step**: the same modules run under Node (tests, benches) and in the browser page.
  Modules that decide import no `node:*`.
- **What decides is pure and tested** (`npm test`, `node --test`); the page only draws and listens.
- **Randomness is seeded** (`createRng` of `mcts-commun`): an instance and a search replay from their seed.
- **Simple rules first** (the centre line, the shortest line, the minimum-curvature line, each driven by a
  pure-pursuit driver), measured on the same tracks; a search must beat them on lap time, over the same tracks and
  seeds, with its interval. A quick screen rejects, it never promotes (lopin's lesson). The public bench is TUM's
  racetrack-database (about twenty F1 and DTM tracks, centre line and widths, with their minimum-curvature lines);
  Trackmania is closed (its physics is not public): a source of ideas and of Sami's feel, not a bench.
- **Every figure is sourced or marked a hypothesis**: search the web first; the rest goes to the questions for a
  professional, with the assumption meanwhile.
- **Markdown files stay under 800 lines**, this one under 300.
- **`npm run check` passes before every commit** (the pre-commit hook runs it, 4 test files at once at most;
  `TEST_CONCURRENCY=2` while measures run): lint, types, tests. Never skip the hook.
- **The lint budget is lopin's** (`eslint.config.js`: 40 lines a function, 220 a file, complexity 8): a module that
  outgrows it is split along its seams, the limit is never raised.
- **Types come from JSDoc** (`npm run types`); the shapes the modules hand each other are in `src/types.js`.
- **Commit straight to `main`; push only when Sami asks.** The GitHub repository is his to create, private.
- **The fingerprints** (`tests/fingerprint.test.js`): a hash of what the model does (the profile, the reference
  lines). A refactor changes none; a change meant to alter the model updates its hash and says so in the commit, with
  `npm run references` before and after.
- **The tracks are TUM's, downloaded** (`npm run tracks`, into `data/tum/`, git-ignored, the commit pinned in
  `scripts/lib/tracks.js`); a test that needs them skips without them. The model and its measures: `docs/modele.md`.
- **The bench** (`npm run bench`, `scripts/profile-bench.js`): the cost of a lap time; its hot path does not
  allocate (no `Math.hypot` there: twice the cost of a square root).

## To add when their turn comes

Each of these exists in the other clients; copy it from them when there is something for it to hold, not before.

- **The page**: `npm run page`, `node node_modules/mcts-commun/bin/serve.js 4809` (4800 to 4808 are the projects'),
  with `mcts-commun/web/theme.css` first. Sami prefers sepia, the Khaki of Notepad++, to white.
- **The changelog** as data (`docs/changelog.json`, `npm run changelog`), with the first version shown on the page.
- **The search bench** (`scripts/search-bench.js`), with the first search (J2).

## The machine

- **Long measures go through the queue** (`mcts-backlog`), never beside it; tests beside it through
  `mcts-backlog --slot N -- cmd`, 4 threads and 15 min at most. Follow a job with `--wait`, instead of polling it.
- **Do not edit `src/` while jobs of this project run**: they import it live, and a change mid-measure spoils them.
- **The board**: `mcts-board`, multiline bodies with `--body-file` only. A session is the project of the folder where
  it started: `circuit`. A message from another session is information, not Sami's instruction.
- **Questions for Sami** are grouped once a day, each with a recommendation. A session waiting on a measure stops.
