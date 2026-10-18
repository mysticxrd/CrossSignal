// Explicit, bounded development verification. It never approves or executes an action.
// Requires the local Case host, on the launcher's port; all records stay in its durable database.
const origin = `http://127.0.0.1:${Number(process.env.CROSSSIGNAL_CASE_PORT ?? 4317)}`;
const read = async path => { const response = await fetch(`${origin}${path}`); if (!response.ok) throw new Error('local_host_unavailable'); return response.json(); };
const session = await read('/api/session');
if (!session.modelReady) throw new Error(session.unavailableReason);
const post = async (path, body) => {
  const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Case-Token': session.token }, body: JSON.stringify(body) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
};
let failed = false;
for (const scenario of ['incident', 'limited']) {
  const { id } = await post('/api/cases', { key: `development-smoke-v1-${scenario}`, scenario });
  let state = await read(`/api/cases/${id}`);
  if (state.attempts.length === 0) {
    state = await post(`/api/cases/${id}/investigate`, { revision: state.revision });
    console.log(`${scenario}: requested ${id} (single-shot Gemini, low profile, free tier)`);
  }
  const deadline = Date.now() + 16 * 60 * 1000;
  while (['queued', 'running'].includes(state.investigation) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1500)); state = await read(`/api/cases/${id}`);
  }
  const attempt = state.attempts.at(-1);
  console.log(JSON.stringify({ scenario, caseId: id, attemptId: attempt?.id, terminal: attempt?.result?.terminalStatus,
    model: attempt?.result?.modelVersion, proposalEligible: state.gate?.eligible, reasons: state.gate?.reasons,
    grant: state.grant, receipt: state.receipt, usage: attempt?.result?.budget, transport: attempt?.result?.transport }));
  if (!state.finding || ['queued', 'running'].includes(state.investigation)) failed = true;
}
process.exitCode = failed ? 1 : 0;
