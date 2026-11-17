import { fedTicks, feedSession } from "../src/drive/session.js";

/**
 * The page's side of the driver by search (web/planner-worker.js): it starts the worker's drive with the page's, and
 * keeps BUFFER ticks of the driver's car ahead of the session, asking for CHUNK at a time, one request at a time.
 * @typedef {import("../src/drive/session.js").Session} Session
 */

/** Ticks: 3 s ahead; 1 s a request, four searches, about 0.2 s of the worker. */
const BUFFER = 300;
const CHUNK = 100;

/** @param {(message: string) => void} fail shows the worker's error */
export function createFeedClient(fail) {
  const client = { worker: /** @type {Worker | null} */ (null), id: 0, pending: false, session: /** @type {Session | null} */ (null) };
  const worker = () => {
    if (client.worker) return client.worker;
    client.worker = new Worker(new URL("planner-worker.js", import.meta.url), { type: "module" });
    client.worker.onmessage = ({ data }) => {
      if (data.id !== client.id) return;
      client.pending = false;
      if (data.error) fail(data.error);
      else if (client.session) feedSession(client.session, data.chunk);
    };
    client.worker.onerror = (event) => fail(event.message);
    return client.worker;
  };
  return {
    /** A new drive: the session to feed, null for the tuned rule (nothing to feed). */
    start(session, { text, offsets, weather = "dry", dry, seed = 1 }) {
      client.id += 1;
      client.session = session;
      client.pending = Boolean(session);
      if (session) worker().postMessage({ type: "start", id: client.id, text, offsets: [...offsets], weather, dry: dry ? [...dry] : null, seed, ticks: CHUNK });
    },
    /** Asks for more when the session's buffer runs low. */
    topUp() {
      if (!client.session || client.pending || fedTicks(client.session) >= BUFFER) return;
      client.pending = true;
      worker().postMessage({ type: "more", id: client.id, ticks: CHUNK });
    },
  };
}
