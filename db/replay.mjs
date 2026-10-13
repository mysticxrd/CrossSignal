import { digest } from './benchmark/contracts.mjs';

// Replays a recorded benchmark run read-only. A bundle (db/replays/<runId>.json) holds the run exactly as
// scripts/run-b01.mjs saved it: `history` is the recorder's hash chain, while `run`, `grade` and `batch` sit
// beside the chain and are labelled that way on the page.
const GENESIS = '0'.repeat(64);

function parsed(row) {
  try { return JSON.parse(row.payload); } catch { return undefined; }
}

// The recorder's own check (benchmark/gemini-store.mjs validate), run on the committed copy.
export function verifyRun(bundle) {
  const scope = bundle.run.scope, rows = bundle.history.length;
  let previous = GENESIS;
  for (const [index, row] of bundle.history.entries()) {
    const sequence = index + 1, payload = parsed(row);
    const intact = payload !== undefined && row.sequence === sequence && row.previous_hash === previous
      && row.workspace === scope.workspaceId && row.case_id === scope.caseId && row.run_id === scope.runId
      && digest({ scope, sequence, kind: row.kind, payload, previousHash: previous }) === row.hash;
    if (!intact) return { ok: false, brokenAt: sequence, head: previous, rows };
    previous = row.hash;
  }
  return { ok: true, brokenAt: null, head: previous, rows };
}

// What a person can follow: the tool calls, what came back or was refused, and the final finding.
export function replaySteps(bundle) {
  const steps = [];
  for (const row of bundle.history) {
    const sequence = row.sequence, payload = parsed(row);
    if (payload === undefined) steps.push({ sequence, kind: 'unreadable' });
    else if (row.kind === 'started') steps.push({ sequence, kind: 'started', atUtc: payload.atUtc });
    else if (row.kind === 'tool_attempt') steps.push({ sequence, kind: 'query', tool: payload.query?.tool ?? null,
      arguments: payload.query?.arguments ?? null,
      denied: payload.invalid === true ? 'invalid' : payload.budgetDenied === true ? 'budget' : null });
    else if (row.kind === 'tool_result') steps.push(payload.result?.error
      ? { sequence, kind: 'refused', reason: payload.result.reason ?? payload.result.error }
      : { sequence, kind: 'returned', evidence: payload.exposedEvidenceIds.length, truncated: payload.result?.truncated === true });
    else if (row.kind === 'terminal') steps.push({ sequence, kind: 'finding', terminalStatus: payload.terminalStatus,
      failureReason: payload.failureReason ?? null, modelVersion: payload.modelVersion ?? null, finding: payload.finding ?? null });
  }
  return steps;
}

// What the page shows for a check: how many timeline rows (from the start), whether the finding appears
// ('verified' or 'hidden'), and a notice above everything else.
export function replayVerdict(check) {
  if (check.ok) return { rows: check.rows, finding: 'verified', notice: null };
  // A broken recording shows only the rows before the break, each of which still verifies, so nothing unproven
  // appears. The finding is always the last row, so it is always hidden; a break at row 1 shows no rows at all.
  const rows = check.brokenAt - 1;
  const shown = rows ? `only rows 1–${rows} are shown` : 'no rows are shown';
  return { rows, finding: 'hidden', notice: `This recording does not verify at row ${check.brokenAt}, so ${shown} and the finding and its grade are hidden.` };
}

// The grader's checks quote the finding ("blamed e_… (checkout deploy v71→v72)"), so they follow it: shown when the
// finding is, null when it is hidden.
export function replayGrade(bundle, verdict) {
  if (verdict.finding === 'hidden') return null;
  return Object.entries(bundle.grade.checks).map(([name, c]) => ({ name, want: c.want, got: c.got, pass: c.pass }));
}
