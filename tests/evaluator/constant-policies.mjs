// Answers that never read the data, scored by the same grader as every run. A method has to beat every one of these before its
// score says it read anything: on B16-B20 a constant "no incident" beat both W1 models.
const CHANGE_TYPES = ['deployment', 'pricing_configuration'];
const answer = ({ status = 'completed', diagnosis = null, alternatives = [], change = null, kind = 'none', target = null }) => ({
  version: 'benchmark-finding-v1', terminalStatus: status, signalSummary: 'Constant policy.',
  hypotheses: diagnosis ? [{ rank: 1, diagnosis, supportIds: [], contradictionIds: [], summary: 'Constant policy.' }] : [],
  affectedSegment: null, relatedChangeId: change, unresolvedAlternatives: alternatives,
  recommendation: { kind, target, summary: 'Constant policy.', boundary: 'recommendation_only',
    risk: kind === 'simulated_rollback' ? 'consequential' : kind === 'read_only_check' ? 'read_only' : 'none',
    approvalRequired: kind === 'simulated_rollback' },
  claims: [] });

export const CONSTANT_POLICIES = Object.freeze({
  'Always "no incident"': () => answer({ diagnosis: 'No incident' }),
  'Always abstain': () => answer({ status: 'epistemic_abstention', kind: 'abstain' }),
  // What the twin rule asks for at T1, said everywhere: only the T2 cases can tell this sentence from reading the data.
  'Always abstain, keeping an outage open': () => answer({ status: 'epistemic_abstention', kind: 'read_only_check',
    alternatives: ['A provider outage cannot be ruled out'] }),
  'Always blame the newest change and roll back': events => {
    const newest = events.filter(e => CHANGE_TYPES.includes(e.type)).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
    return newest ? answer({ diagnosis: 'The newest change regressed', change: newest.id, kind: 'simulated_rollback', target: newest.id })
      : answer({ diagnosis: 'No incident' });
  },
});

// `methods` are the runs to set against the policies: { name, scores, causes }, each list holding one number a batch.
export function renderConstants(constants, methods) {
  const [{ maxScore, runs }] = constants;
  return ['## Do-nothing policies', '',
    'Answers that never read the data, scored by the same grader. A method has to beat every one of them before its score says it '
      + `read anything. Each number is one batch: checks passed of ${maxScore}, cause check of ${runs}.`, '',
    '| Who | Checks passed | Cause check | By case |', '|---|---|---|---|',
    ...constants.map(c => `| ${c.name} | ${c.score} | ${c.cause} | ${Object.entries(c.byCase).map(([label, n]) => `${label} ${n}`).join(', ')} |`),
    ...methods.map(m => `| ${m.name} | ${m.scores.join(', ')} | ${m.causes.join(', ')} | |`), ''];
}
