import { checkStamp, replayGrade, replaySteps, replayVerdict, verifyRun } from '../replay.mjs';
import r_5761937b157e from './r_5761937b157e.json' with { type: 'json' };
import r_fcb7e11ebcfa from './r_fcb7e11ebcfa.json' with { type: 'json' };
import r_c72728d0a839 from './r_c72728d0a839.json' with { type: 'json' };
import STAMPS from './stamps.json' with { type: 'json' };

// Every recording the public replay page can show, written by scripts/export-replay.mjs. A run id from a URL is
// only ever a key into this map, never a file path. B17 is listed with all three of its W1 runs, the 0/5 one too.
export const RUNS = new Map([r_5761937b157e, r_fcb7e11ebcfa, r_c72728d0a839].map(bundle => [bundle.run.scope.runId, bundle]));
export { STAMPS };
// Where a visitor downloads the exact committed bytes and proof, to check them without this site.
export const SOURCE_URL = 'https://raw.githubusercontent.com/mysticxrd/CrossSignal/main/db/replays/';

// Each recording is checked once per process (or Worker isolate), not on every view.
const loaded = new Map();
export function loadReplay(runId) {
  if (!RUNS.has(runId)) return null;
  if (!loaded.has(runId)) {
    const bundle = RUNS.get(runId), check = verifyRun(bundle), stamped = checkStamp(bundle, STAMPS[runId]);
    const siblings = [...RUNS.values()].filter(other => other.grade.caseRef === bundle.grade.caseRef
      && other.grade.method === bundle.grade.method && other.batch.profile === bundle.batch.profile)
      .map(other => ({ runId: other.run.scope.runId, batch: other.batch.name, score: other.grade.score, maxScore: other.grade.maxScore }));
    const verdict = replayVerdict(check, stamped);
    loaded.set(runId, { bundle, check, stamped, verdict, grade: replayGrade(bundle, verdict), steps: replaySteps(bundle), siblings });
  }
  return loaded.get(runId);
}
