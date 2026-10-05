// Profiles the W1 real-data baseline (data/ga4-merch/daily.csv) before any case is designed: coverage, funnel
// sanity, normal day-to-day spread, weekday pattern, how each candidate segment split holds up, and the biggest
// real week-over-week moves (shown in cases, never graded). Prints only; writes nothing.
// Usage: node scripts/profile-ga4.mjs [path/to/daily.csv]
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDaily } from '../db/benchmark/ga4-daily.mjs';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const sum = (rows, key) => rows.reduce((n, r) => n + r[key], 0);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = xs => Math.sqrt(mean(xs.map(x => (x - mean(xs)) ** 2)));
const pct = (a, b) => b === 0 ? '—' : `${(100 * a / b).toFixed(1)}%`;
const fixed = (x, d = 1) => Number.isFinite(x) ? x.toFixed(d) : '—';
const weekday = day => WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
const groupBy = (rows, key) => rows.reduce((m, r) => m.set(r[key], [...(m.get(r[key]) ?? []), r]), new Map());

function table(head, rows) {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  const line = cells => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  return [line(head), line(widths.map(w => '-'.repeat(w))), ...rows.map(line)].join('\n');
}

export function profile(rows) {
  const out = [], days = [...new Set(rows.map(r => r.day))].sort();
  const byDay = groupBy(rows, 'day');
  const daily = days.map(day => ({ day, sessions: sum(byDay.get(day), 'sessions'),
    purchases: sum(byDay.get(day), 'sessions_purchase'), revenue: sum(byDay.get(day), 'revenue_usd') }));
  out.push(`Rows ${rows.length} · days ${days.length} (${days[0]} to ${days.at(-1)})`);
  const expected = Math.round((Date.parse(`${days.at(-1)}T00:00:00Z`) - Date.parse(`${days[0]}T00:00:00Z`)) / 86_400_000) + 1;
  if (expected !== days.length) out.push(`Missing days: ${expected - days.length}`);

  const t = key => sum(rows, key);
  out.push('', 'Totals', table(['sessions', 'users', 'begin_checkout', 'add_payment_info', 'purchase sessions', 'purchase events',
    'transaction ids', 'revenue USD'], [[t('sessions'), t('users'), t('sessions_begin_checkout'), t('sessions_add_payment_info'),
    t('sessions_purchase'), t('purchase_events'), t('transaction_ids'), fixed(t('revenue_usd'), 0)]]));
  const odd = rows.filter(r => r.sessions_purchase > r.sessions_begin_checkout);
  out.push(`Funnel: ${pct(t('sessions_begin_checkout'), t('sessions'))} of sessions begin checkout; `
    + `${pct(t('sessions_purchase'), t('sessions_begin_checkout'))} of those purchase. `
    + `${odd.length} rows have more purchase sessions than checkout sessions (${sum(odd, 'sessions_purchase')} purchase sessions).`);

  const spread = key => { const xs = daily.map(d => d[key]); return [fixed(mean(xs)), Math.min(...xs), Math.max(...xs), fixed(sd(xs) / mean(xs), 2)]; };
  out.push('', 'Sitewide per day', table(['measure', 'mean', 'min', 'max', 'CV'],
    [['sessions', ...spread('sessions')], ['purchase sessions', ...spread('purchases')], ['revenue USD', ...spread('revenue')]]));
  const all = mean(daily.map(d => d.revenue));
  out.push('', 'Weekday pattern (mean per day, revenue relative to the overall mean)', table(['day', 'sessions', 'purchases', 'revenue', 'vs mean'],
    WEEKDAYS.map(w => { const ds = daily.filter(d => weekday(d.day) === w);
      return [w, fixed(mean(ds.map(d => d.sessions)), 0), fixed(mean(ds.map(d => d.purchases))), fixed(mean(ds.map(d => d.revenue)), 0),
        pct(mean(ds.map(d => d.revenue)), all)]; })));

  for (const key of ['device', 'user_medium', 'session_medium']) {
    const groups = [...groupBy(rows, key)].sort((a, b) => sum(b[1], 'sessions') - sum(a[1], 'sessions'));
    out.push('', `Split by ${key} (purchase sessions per day; CV is day-to-day spread)`, table(
      [key, 'session share', 'conversion', 'purchases/day', 'min/day', 'CV', 'revenue share'],
      groups.map(([value, rs]) => {
        const per = days.map(day => sum(rs.filter(r => r.day === day), 'sessions_purchase'));
        return [value, pct(sum(rs, 'sessions'), t('sessions')), pct(sum(rs, 'sessions_purchase'), sum(rs, 'sessions')),
          fixed(mean(per)), Math.min(...per), fixed(sd(per) / mean(per), 2), pct(sum(rs, 'revenue_usd'), t('revenue_usd'))];
      })));
  }

  const moves = daily.slice(7).map((d, i) => ({ ...d, prior: daily[i].revenue, change: (d.revenue - daily[i].revenue) / daily[i].revenue }))
    .filter(d => d.prior > 0).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
  out.push('', 'Biggest real week-over-week revenue moves (same weekday, prior week)', table(['day', 'weekday', 'revenue', 'week before', 'change'],
    moves.map(d => [d.day, weekday(d.day), fixed(d.revenue, 0), fixed(d.prior, 0), `${d.change > 0 ? '+' : ''}${(100 * d.change).toFixed(0)}%`])));
  return out.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ? resolve(process.argv[2]) : undefined;
  console.log(profile(loadDaily(path)));
}
