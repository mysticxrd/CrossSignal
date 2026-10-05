// Reads the W1 real-data baseline: data/ga4-merch/daily.csv, exported from the GA4 Google Merchandise Store
// obfuscated sample by data/ga4-merch/daily.sql. One row per day, device and traffic medium. Public data with no
// answers in it, so the runner, the generator and the profiler may all read it.
import { readFileSync } from 'node:fs';
import { requireThat } from './contracts.mjs';

export const GA4_SOURCE = Object.freeze({
  dataset: 'bigquery-public-data.ga4_obfuscated_sample_ecommerce',
  name: 'Google Merchandise Store GA4 obfuscated sample',
  license: 'CC BY 4.0',
  attribution: 'Google Analytics 4 sample ecommerce dataset (Google Merchandise Store), via BigQuery public datasets',
  firstDay: '2020-11-01', lastDay: '2021-01-31',
});
export const TEXT_COLUMNS = Object.freeze(['day', 'device', 'user_medium', 'session_medium']);
export const COUNT_COLUMNS = Object.freeze(['sessions', 'users', 'sessions_view_item', 'sessions_add_to_cart',
  'sessions_begin_checkout', 'sessions_add_payment_info', 'sessions_purchase', 'purchase_events', 'transaction_ids']);
export const COLUMNS = Object.freeze([...TEXT_COLUMNS, ...COUNT_COLUMNS, 'revenue_usd']);

// Minimal RFC 4180 reader: BigQuery quotes a field only when it holds a comma, quote or newline.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  requireThat(!quoted, 'csv: unterminated quote');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

export function parseDaily(text) {
  // A console download may start with a byte-order mark.
  const [header, ...body] = parseCsv(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text);
  requireThat(header && header.join(',') === COLUMNS.join(','), `ga4 csv: expected columns ${COLUMNS.join(',')}`);
  return body.map((cells, n) => {
    requireThat(cells.length === COLUMNS.length, `ga4 csv row ${n + 2}: expected ${COLUMNS.length} fields`);
    const row = Object.fromEntries(COLUMNS.map((k, i) => [k, cells[i]]));
    requireThat(/^\d{4}-\d\d-\d\d$/.test(row.day) && row.day >= GA4_SOURCE.firstDay && row.day <= GA4_SOURCE.lastDay,
      `ga4 csv row ${n + 2}: day outside the sample`);
    for (const k of COUNT_COLUMNS) {
      row[k] = Number(row[k]);
      requireThat(Number.isSafeInteger(row[k]) && row[k] >= 0, `ga4 csv row ${n + 2}: ${k} is not a count`);
    }
    row.revenue_usd = row.revenue_usd === '' ? 0 : Number(row.revenue_usd);
    requireThat(Number.isFinite(row.revenue_usd) && row.revenue_usd >= 0, `ga4 csv row ${n + 2}: revenue_usd is not an amount`);
    requireThat(row.sessions_purchase <= row.sessions && row.sessions_begin_checkout <= row.sessions,
      `ga4 csv row ${n + 2}: funnel counts exceed sessions`);
    return row;
  });
}

export const loadDaily = (path = new URL('../../data/ga4-merch/daily.csv', import.meta.url)) => parseDaily(readFileSync(path, 'utf8'));
