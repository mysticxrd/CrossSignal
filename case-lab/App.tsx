import { useEffect, useRef, useState } from 'react';
import { CaseDetail } from './CaseDetail';
import { type CaseSummary, type CaseView, type Session, label } from './types';
async function read<T>(path: string): Promise<T> {
  const response = await fetch(path); const data = await response.json();
  if (!response.ok) throw new Error(data.error); return data;
}
const scenarios = [['incident', 'Paid-conversion incident'], ['limited', 'Incident with missing health evidence'],
  ['normal', 'Normal conversion'], ['partial', 'Partial recovery'], ['ineffective', 'Unchanged after action'],
  ['incomplete', 'Incomplete source coverage'], ['spontaneous', 'Recovery without an intervention']];
export default function App() {
  const [session, setSession] = useState<Session | null>(null), [cases, setCases] = useState<CaseSummary[]>([]);
  const [selected, setSelected] = useState(() => location.hash.slice(1)), [detail, setDetail] = useState<CaseView | null>(null);
  const [scenario, setScenario] = useState('incident'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef<{ scenario: string; key: string } | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        // The session and list load first, so a saved Case that no longer exists cannot hide them.
        const [nextSession, nextCases] = await Promise.all([read<Session>('/api/session'), read<CaseSummary[]>('/api/cases')]);
        if (active) { setSession(nextSession); setCases(nextCases); }
        const nextDetail = selected ? await read<CaseView>(`/api/cases/${selected}`) : null;
        if (active) setDetail(current => current && nextDetail && current.id === nextDetail.id && current.revision > nextDetail.revision ? current : nextDetail);
      } catch (failure) {
        if (!active) return;
        const message = failure instanceof Error ? failure.message : 'Connection interrupted';
        // Replace the missing Case's history entry, so Back can't return to it (and no hashchange clears the banner).
        if (message === 'case_not_found') { setSelected(''); history.replaceState(null, '', location.pathname + location.search); }
        setError(message);
      }
    };
    void refresh(); const timer = setInterval(refresh, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [selected]);
  useEffect(() => {
    // Back, Forward and an edited address change the hash without a click, so the selection follows the hash.
    const follow = () => { setSelected(location.hash.slice(1)); setError(''); };
    addEventListener('hashchange', follow); return () => removeEventListener('hashchange', follow);
  }, []);
  const select = (id: string) => { setSelected(id); location.hash = id; setError(''); };
  async function post(path: string, body: unknown) {
    if (!session) return null;
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Case-Token': session.token }, body: JSON.stringify(body) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
  }
  async function perform(action: string, reason = '') {
    if (!detail || busy) return;
    setBusy(true); setError('');
    try {
      const suffix = action === 'investigate' || action === 'approve' ? action : 'command';
      const body = action === 'approve' ? { proposalHash: detail.proposal?.hash } : action === 'investigate'
        ? { revision: detail.revision } : { revision: detail.revision, command: action, reason };
      setDetail(await post(`/api/cases/${detail.id}/${suffix}`, body));
      setCases(await read('/api/cases')); setSession(await read('/api/session'));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  async function create() {
    setBusy(true); setError('');
    // Reuse the key until a response arrives: if the Case was created but its response was lost, the retry returns that Case.
    if (pending.current?.scenario !== scenario) pending.current = { scenario, key: crypto.randomUUID() };
    const { key } = pending.current;
    try { const result = await post('/api/cases', { key, scenario });
      if (result) { pending.current = null; select(result.id); setCases(await read('/api/cases')); } }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not create Case'); }
    finally { setBusy(false); }
  }
  // Until the Case the hash names has loaded, the previous one is neither shown nor open to actions.
  // CaseDetail is keyed by Case id, so an unsent reason never carries over to another Case.
  const shown = detail?.id === selected ? detail : null;
  return <div className="shell">
    <aside className="sidebar">
      <button onClick={() => select('')} className="brand"><span className="brand-mark">×</span> CrossSignal<span className="brand-dot">●</span></button>
      <p className="eyebrow">LOCAL CASE LAB</p><p className="sidebar-intro">Follow the evidence.<br />Keep the decision yours.</p>
      <div className="create-form"><label htmlFor="scenario">Start with a synthetic situation</label>
        <select id="scenario" value={scenario} onChange={event => setScenario(event.target.value)}>{scenarios.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select>
        <button className="primary" disabled={busy || !session} onClick={create}>+ Open a Case</button></div>
      <div className="list-title">YOUR CASES <span>{cases.length}</span></div>
      <nav aria-label="Cases">{cases.map((item, i) => <button key={item.id} className={`case-link ${item.id === selected ? 'selected' : ''}`} onClick={() => select(item.id)}>
        <span className="case-number">CASE {String(cases.length - i).padStart(2, '0')}</span><strong>{item.title}</strong>
        <span className="case-link-status"><i className={item.status === 'closed' ? 'closed-dot' : ''} />{label(item.status)} · {label(item.investigation)}</span></button>)}</nav>
      <div className="sidebar-foot"><span className="live-dot" /> Local owner<br /><small>All business data and actions are simulated.</small></div>
    </aside>
    <main className="workspace"><header className="topbar"><span>WORKSPACE / INVESTIGATIONS</span><span className="badge">SIMULATED</span></header>
      {error && <div className="error" role="alert"><strong>Request needs attention</strong><p>{label(error)}</p><button onClick={() => setError('')}>Dismiss</button></div>}
      {shown && session ? <CaseDetail key={shown.id} data={shown} session={session} busy={busy} onAction={perform} /> : <div className="empty-state">
        <span className="eyebrow">FROM SIGNAL TO OUTCOME</span><h1>A decision you can<br />trace back to evidence.</h1>
        <p>Open a Case to investigate a SaaS paid-conversion incident. Review competing explanations, decide whether to run a simulation, then observe what happened.</p>
        <div className="empty-steps"><span>01 / Investigate</span><span>02 / Decide</span><span>03 / Observe</span></div>
        <p className="muted">{selected ? 'Loading the saved Case…' : 'Choose a situation in the sidebar to begin.'}</p></div>}
    </main>
  </div>;
}
