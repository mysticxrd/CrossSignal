import assert from 'node:assert/strict';
import test from 'node:test';
import { COLUMNS, parseCsv, parseDaily } from '../db/benchmark/ga4-daily.mjs';
import { profile } from '../scripts/profile-ga4.mjs';

const header = COLUMNS.join(',');
const row = (day, device, medium, sessions, purchases, revenue) =>
  [day, device, medium, medium, sessions, sessions, sessions, purchases * 3, purchases * 2, purchases, purchases, purchases, purchases, revenue].join(',');

test('the CSV reader handles a BOM, CRLF line ends and quoted fields', () => {
  const bom = String.fromCharCode(0xFEFF);
  assert.deepEqual(parseCsv(`${bom}a,b\r\n"x, ""y""",2\r\n`), [[`${bom}a`, 'b'], ['x, "y"', '2']]);
  const rows = parseDaily(`${bom}${header}\r\n${row('2020-11-01', 'mobile', '(none)', 40, 2, 81.5)}\r\n`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sessions, 40);
  assert.equal(rows[0].revenue_usd, 81.5);
});

test('the baseline loader refuses a changed export instead of guessing', () => {
  assert.throws(() => parseDaily('day,device\n2020-11-01,mobile\n'), /expected columns/);
  assert.throws(() => parseDaily(`${header}\n${row('2021-02-01', 'mobile', 'organic', 40, 2, 10)}\n`), /day outside the sample/);
  assert.throws(() => parseDaily(`${header}\n${row('2020-11-01', 'mobile', 'organic', 1.5, 0, 10)}\n`), /sessions is not a count/);
  assert.throws(() => parseDaily(`${header}\n${row('2020-11-01', 'mobile', 'organic', 3, 4, 10)}\n`), /funnel counts exceed sessions/);
});

test('the profile reports spread, weekday pattern, splits and real week-over-week moves', () => {
  const lines = [header];
  for (let d = 1; d <= 14; d++) {
    const day = `2020-11-${String(d).padStart(2, '0')}`;
    lines.push(row(day, 'desktop', 'organic', 100 + d, 5 + (d % 3), 300 + d * 10), row(day, 'mobile', 'referral', 60, 2, 90));
  }
  const text = profile(parseDaily(`${lines.join('\n')}\n`));
  assert.match(text, /days 14 \(2020-11-01 to 2020-11-14\)/);
  for (const part of ['Sitewide per day', 'Weekday pattern', 'Split by device', 'Split by session_medium', 'Biggest real week-over-week'])
    assert.ok(text.includes(part), part);
});
