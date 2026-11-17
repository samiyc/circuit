import { createBicycle, profileCar } from "../src/drive/bicycle.js";
import { createFeed, feedTicks } from "../src/drive/feed.js";
import { pathOf } from "../src/drive/pursuit.js";
import { createTrack, parseTrack } from "../src/track/track.js";
import { createLap } from "../src/view/lap.js";
import { carIn } from "./weather.js";

/**
 * The driver by search's car, driven ahead of the drive page (src/drive/feed.js): `start` sets a drive on a line and a
 * weather (web/weather.js),
 * `more` asks for its next ticks. Each answer carries the drive's id, so the page drops those of a drive it left.
 */
const CAR = createBicycle();
let drive = { id: -1, feed: /** @type {ReturnType<typeof createFeed> | null} */ (null) };

self.onmessage = ({ data }) => {
  try {
    if (data.type === "start") {
      const track = createTrack(parseTrack(data.text));
      const dry = data.dry ? Float64Array.from(data.dry) : undefined;
      const path = pathOf(createLap(track, carIn(profileCar(CAR), track, data.weather, dry), Float64Array.from(data.offsets)), track);
      drive = { id: data.id, feed: createFeed({ track, path, car: carIn(CAR, track, data.weather, dry) }, { seed: data.seed }) };
    }
    if (data.id !== drive.id || !drive.feed) return;
    const chunk = feedTicks(drive.feed, data.ticks);
    self.postMessage({ id: data.id, chunk }, { transfer: [chunk.buffer] });
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
