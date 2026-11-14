import { pointMassF1 } from "../src/car.js";
import { lineBounds } from "../src/line/line.js";
import { referenceLines } from "../src/line/references.js";
import { bestLine } from "../src/search/best-line.js";
import { createTrack, parseTrack } from "../src/track/track.js";

/**
 * The lines the page computes when `npm run lines` has not run (web/load.js): the three references, or the search
 * from the minimum-curvature line, off the page's thread. Seed 1, as the script.
 */
self.onmessage = ({ data: { text, task, base } }) => {
  try {
    const track = createTrack(parseTrack(text));
    if (task === "references") {
      const { centre, shortest, minCurvature } = referenceLines(track);
      self.postMessage({ lines: { centre: [...centre], shortest: [...shortest], minCurvature: [...minCurvature] } });
      return;
    }
    const { search, best } = bestLine({ track, car: pointMassF1(), bounds: lineBounds(track), base: Float64Array.from(base) }, { seed: 1 });
    self.postMessage({ lines: { search: [...search], best: [...best] } });
  } catch (error) {
    self.postMessage({ error: String(error?.message ?? error) });
  }
};
