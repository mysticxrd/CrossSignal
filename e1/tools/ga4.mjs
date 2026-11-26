// Ticket 09: ga4_run_report, shaped as the GA4 Data API's properties.runReport answers. The backend answers raw
// day records (e1/analytics.mjs), the day holding now already cut at now; this gives them runReport's headers, rows
// of string values, rowCount and metadata. tests/fixtures/ga4-docs.json holds the doc fields it must match.
import { CURSOR, REPORT_DAY, defineTool, fail, listPage, note } from './core.mjs';
import { storeTime } from '../world.mjs';

const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
// The metrics served, with their MetricHeader types and the day record each reads.
export const GA4_METRICS = Object.freeze({
  sessions: ['TYPE_INTEGER', d => d.sessions], addToCarts: ['TYPE_INTEGER', d => d.addToCarts],
  checkouts: ['TYPE_INTEGER', d => d.checkouts], ecommercePurchases: ['TYPE_INTEGER', d => d.purchases],
  purchaseRevenue: ['TYPE_CURRENCY', d => d.revenue_paise],
});
// GA4 sends every value as a string; revenue in the property's currency, rupees here.
const metricValue = (name, n) => ({ value: name === 'purchaseRevenue' ? String(n / 100) : String(n) });

// A DateRange day as YYYY-MM-DD; today, yesterday and NdaysAgo count back from now's day in the property's zone.
export function resolveDay(text, now) {
  if (/^\d{4}-/.test(text)) return text;
  const back = text === 'today' ? 0 : text === 'yesterday' ? 1 : Number(text.slice(0, -'daysAgo'.length));
  return new Date(Date.parse(`${storeTime(now).slice(0, 10)}T00:00:00Z`) - back * 86400000).toISOString().slice(0, 10);
}
const invalid = message => ({ code: 400, message, status: 'INVALID_ARGUMENT' });
const countError = (field, count, message) => fail(invalid(message), note('arg_count', { field, count, tool: 'ga4_run_report' }));

export const GA4_TOOLS = Object.freeze([
  defineTool({
    name: 'ga4_run_report',
    description: 'The store\'s GA4 report for two date ranges in store time (IST), as of now: the chosen metrics per range, or per day and range with the date dimension. A range that holds today counts it up to now. Rows are 20 a page.',
    schema: object({
      dateRanges: { type: 'array', items: object({ startDate: REPORT_DAY, endDate: REPORT_DAY }), description: 'Exactly two: the range to look at, then the one to compare it with.' },
      dimensions: { type: 'array', items: object({ name: { type: 'string', enum: ['date'] } }), description: 'Empty for one row per range, or [{"name":"date"}] for one row per day.' },
      metrics: { type: 'array', items: object({ name: { type: 'string', enum: Object.keys(GA4_METRICS) } }), description: '1 to 5 different metrics.' },
      cursor: CURSOR,
    }),
    handler: async (args, { backend, now }) => {
      const metrics = args.metrics.map(m => m.name), byDate = args.dimensions.length === 1;
      if (args.dateRanges.length !== 2) return countError('dateRanges', 2, 'Exactly two date ranges are required.');
      if (args.dimensions.length > 1) return countError('dimensions', '0 or 1', 'The date dimension may be named once.');
      if (metrics.length === 0 || new Set(metrics).size !== metrics.length) return countError('metrics', '1 to 5 different', 'Metrics must be named once each.');
      const ranges = args.dateRanges.map(r => ({ start: resolveDay(r.startDate, now), end: resolveDay(r.endDate, now) }));
      const backwards = ranges.findIndex(r => r.start > r.end);
      if (backwards >= 0) {
        return fail(invalid('A date range\'s startDate is after its endDate.'), note('window_order', { tool: 'ga4_run_report',
          from: ranges[backwards].start, to: ranges[backwards].end, start: `dateRanges[${backwards}].startDate`, end: `dateRanges[${backwards}].endDate` }));
      }
      // Every row of the report: per day, or one total per range; a range with no days yet has no row, as GA4
      // leaves out rows whose metrics are all zero.
      const rows = [];
      for (const [i, range] of ranges.entries()) {
        const { body: days } = await backend.ga4Daily({ start_date: range.start, end_date: range.end });
        const row = (dimension, records) => ({ dimensionValues: [...dimension, { value: `date_range_${i}` }],
          metricValues: metrics.map(name => metricValue(name, records.reduce((sum, d) => sum + GA4_METRICS[name][1](d), 0))) });
        if (byDate) rows.push(...days.map(d => row([{ value: d.date.replaceAll('-', '') }], [d])));
        else if (days.length) rows.push(row([], days));
      }
      return listPage({
        tool: 'ga4_run_report', args, now, project: row => row,
        fetch: async ({ count, skip }) => ({ ok: true, body: { items: rows.slice(skip, skip + count) } }),
        wrap: page => ({
          dimensionHeaders: [...(byDate ? ['date'] : []), 'dateRange'].map(name => ({ name })),
          metricHeaders: metrics.map(name => ({ name, type: GA4_METRICS[name][0] })),
          ...(page.length && { rows: page, rowCount: rows.length }),
          metadata: { currencyCode: 'INR', timeZone: 'Asia/Kolkata' }, kind: 'analyticsData#runReport',
        }),
      });
    },
  }),
]);
