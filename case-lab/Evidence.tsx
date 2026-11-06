import { type Evidence, percent, time } from './types';
export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return <div className="evidence-list">{evidence.map(row => <details key={row.id} id={row.id} className="evidence-row">
    <summary><span className={`evidence-kind ${row.kind}`}>{row.kind}</span><span>{row.kind === 'conversion'
      ? `${row.cohort} · ${row.period} · ${time(row.start!)}` : `${row.service ?? row.cohort} · ${row.kind}`}</span>
      <strong>{row.kind === 'conversion' ? percent(row.conversionPercent) : row.kind === 'health' ? `${row.failures} failures` : row.kind === 'deployment' ? row.to : 'Untrusted text'}</strong></summary>
    {row.kind === 'conversion' ? <p>{row.successes} completed subscriptions / {row.intents} eligible purchase intents. {row.limitation ?? 'Mature cohort; all required sources covered.'}</p>
      : <p>{row.detail ?? `${row.from} → ${row.to}`}</p>}
    <div className="evidence-meta">{row.occurredAt && <span>Occurred {time(row.occurredAt)}</span>}{row.availableAt && <span>Available {time(row.availableAt)}</span>}
      <code>{row.id}</code></div>
  </details>)}</div>;
}
const title = (word = '') => word.charAt(0).toUpperCase() + word.slice(1);
// What a record is, in words. Its id and version names stay inside the record itself.
const recordName = (row: Evidence) => row.kind === 'conversion' ? `${row.cohort === 'new-assisted' ? 'Staff-help' : 'Online'} sign-ups, ${time(row.start!)}`
  : row.kind === 'deployment' ? `${title(row.service)} update` : row.kind === 'health' ? `${title(row.service)} health check` : 'Customer message';
export function Citations({ ids, evidence }: { ids: string[]; evidence: Evidence[] }) {
  return <div className="citations">{ids.map((id, i) => {
    const row = evidence.find(e => e.id === id);
    return row ? <button key={`${id}-${i}`} onClick={() => { const element = document.getElementById(id) as HTMLDetailsElement | null;
      if (element) { element.open = true; element.scrollIntoView({ behavior: 'smooth', block: 'center' }); element.focus(); } }}>
      {recordName(row)}</button>
      : <span key={`${id}-${i}`} className="unknown-citation">A record this Case doesn&apos;t have</span>;
  })}</div>;
}
