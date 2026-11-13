import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { TRACK_NAMES, TUM_COMMIT, TUM_DIR } from "./lib/tracks.js";

/**
 * `npm run tracks [--force]`: downloads TU Munich's racetrack-database (LGPL-3.0) into data/tum/, which git ignores
 * (decided with Sami on 13/11/2026: nothing of it is copied into the repository). The commit is pinned, so every
 * machine measures on the same tracks. A file already there is kept, unless --force.
 */
const BASE = `https://raw.githubusercontent.com/TUMFTM/racetrack-database/${TUM_COMMIT}`;
const force = process.argv.includes("--force");

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} : ${response.status} ${response.statusText}`);
  return response.text();
}

/** @returns {Promise<number>} the files fetched, 0 or 1 */
async function download(remote, local) {
  if (!force && (await exists(local))) return 0;
  await writeFile(local, await fetchText(`${BASE}/${remote}`));
  return 1;
}

await mkdir(join(TUM_DIR, "tracks"), { recursive: true });
await mkdir(join(TUM_DIR, "racelines"), { recursive: true });
let fetched = await download("LICENSE", join(TUM_DIR, "LICENSE"));
fetched += await download("README.md", join(TUM_DIR, "README.md"));
for (const name of TRACK_NAMES) {
  fetched += await download(`tracks/${name}.csv`, join(TUM_DIR, "tracks", `${name}.csv`));
  fetched += await download(`racelines/${name}.csv`, join(TUM_DIR, "racelines", `${name}.csv`));
}
console.log(`${fetched} fichier(s) téléchargé(s) dans ${TUM_DIR} (racetrack-database @ ${TUM_COMMIT.slice(0, 7)})`);
