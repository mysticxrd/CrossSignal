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
export function Citations({ ids, evidence }: { ids: string[]; evidence: Evidence[] }) {
  return <div className="citations">{ids.map((id, i) => {
    const row = evidence.find(e => e.id === id);
    return row ? <button key={`${id}-${i}`} onClick={() => { const element = document.getElementById(id) as HTMLDetailsElement | null;
      if (element) { element.open = true; element.scrollIntoView({ behavior: 'smooth', block: 'center' }); element.focus(); } }}>
      {row.kind === 'conversion' ? `${row.cohort} / ${row.period}` : `${row.service ?? 'Support'} / ${row.kind}`}</button>
      : <span key={`${id}-${i}`} className="unknown-citation">Unknown citation: {id}</span>;
  })}</div>;
}
