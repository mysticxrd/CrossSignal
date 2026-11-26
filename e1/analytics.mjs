// The GA4 side of the simulator (ticket 09): the store's GA4 property, day by day, as of the case clock. Answers have
// the backend interface's form; bodies are raw day records, which e1/tools/ga4.mjs gives the Data API's runReport
// shape. The funnel counts (sessions, add to cart, checkout) are GA4's real daily counts; purchases and their
// revenue are the world's orders paid in the browser, counted at the second they were paid, so GA4 agrees with
// store revenue and with every cause that stops an order being paid.
//
// The day that holds "now" is cut at "now": a funnel count by the share of the day's order-weighted hours that have
// passed, purchases by paid_at. The leak scanner cannot see inside a count, so nothing after "now" may reach one.
// A funnel count is never below the day's purchases, as every purchase began a session and a checkout; early in a
// day the hour weights alone can fall short of the orders actually paid.
const DAY = 86400;

// `orders` are as built. A later mark-paid write (ticket 18) happens in the dashboard, not the customer's browser,
// so it must leave these counts alone.
export function openAnalytics({ version, days, orders }) {
  const hours = version.hours, weight = hours.reduce((sum, w) => sum + w, 0);
  // The share of a day's traffic that has arrived `elapsed` seconds into it.
  const share = elapsed => {
    const h = Math.floor(elapsed / 3600);
    return (hours.slice(0, h).reduce((sum, w) => sum + w, 0) + (h < 24 ? hours[h] * (elapsed % 3600) / 3600 : 0)) / weight;
  };
  const paid = orders.filter(o => o.paid_at !== undefined).sort((a, b) => a.paid_at - b.paid_at);

  return {
    // Days from start_date to end_date (YYYY-MM-DD, store time), both inclusive, that have begun by now.
    daily({ start_date, end_date }, now) {
      return { ok: true, http: 200, body: days.filter(d => d.date >= start_date && d.date <= end_date && d.start <= now).map(d => {
        const cut = Math.min(now + 1, d.start + DAY), part = cut - d.start < DAY ? share(cut - d.start) : 1;
        const bought = paid.filter(o => o.paid_at >= d.start && o.paid_at < cut);
        return {
          date: d.date,
          ...Object.fromEntries(Object.entries(d.funnel).map(([metric, n]) => [metric, Math.max(Math.floor(n * part), bought.length)])),
          purchases: bought.length, revenue_paise: bought.reduce((sum, o) => sum + o.total_paise, 0),
        };
      }) };
    },
  };
}
