// A case (section 1 decisions 4, 6 and 9; ticket 05): the baseline world plus at most one cause and at most one
// decoy, each injected from the case seed. The world hash covers the injection record (ADR 0001), and the
// counterfactual check proves the case before any run: remove the cause and the dip goes; remove the decoy and the
// dip stays. Decision code: no wall clock, no Math.random.
import { requireThat } from '../db/benchmark/contracts.mjs';
import { freezeNow, measure } from './trigger.mjs';
import { WORLD_VERSION, buildWorld, orderNotes, possibleNows, razorpayId, seededRandom, worldHash } from './world.mjs';

const DAY = 86400;
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));

// Each injector changes the built world's records from the cause's start to the world's end (the hidden future days
// included, Fix F7) and returns what it did. Its randomness is its own stream of the case seed, so the baseline's
// orders are the same with or without it, and the counterfactual compares like with like.
const CAUSES = {
  plugin_670(world, { starts_at }, rng) {
    const v = world.version, c = v.causes.plugin_670, webhookOnly = new Map(c.webhook_only_pct);
    const affected = [];
    for (const order of world.orders) {
      // The plugin acts when the payment reaches the store, so the payment's time decides, not the order's.
      if (order.payment.created_at < starts_at) continue;
      const p = order.payment, viaWebhook = rng() * 100 < webhookOnly.get(p.method);
      const cron = between(rng, c.cron_s), packed = between(rng, c.merchant_capture_s);
      if (!viaWebhook) { p.captured_at = p.created_at + packed; continue; } // paid by the callback, captured when packed
      // The webhook's cron job marks the order Failed (#670); the payment stays authorized until the capture window
      // ends and Razorpay refunds it.
      delete order.paid_at;
      Object.assign(order, { status: 'failed', failed_at: p.created_at + cron, notes: orderNotes(v, 'failed', p.id, p.created_at + cron) });
      p.status = 'authorized';
      delete p.captured_at;
      p.refunds = [{ id: razorpayId(v.id, world.seed, order.index, 'rfnd'), amount_paise: p.amount_paise, status: 'processed',
        speed_requested: v.capture.refund_speed, speed_processed: v.capture.refund_speed,
        created_at: p.created_at + v.capture.manual_capture_timeout_minutes * 60 }];
      affected.push(order.woo_id);
    }
    return { plugin_version: c.plugin_version, payment_action: c.payment_action, affected_orders: affected };
  },
};
// Decoys arrive with ticket 05e.
const DECOYS = {};

function inject(world, registry, spec, role) {
  if (spec === null) return null;
  const injector = registry[spec?.kind];
  requireThat(typeof injector === 'function', `case: unknown ${role} ${spec?.kind}`);
  // From a day before the first possible "now" (so a dip day can be all cause) to the last, so the trigger can fire.
  const nows = possibleNows(world);
  requireThat(Number.isInteger(spec.starts_at) && spec.starts_at >= nows[0] - DAY && spec.starts_at < nows.at(-1),
    `case: the ${role} must start where the trigger can still fire, in whole seconds`);
  const rng = seededRandom(world.version.id, world.seed, role, spec.kind, spec.starts_at);
  return { ...spec, ...injector(world, spec, rng) };
}

// spec: { seed, cause: { kind, starts_at } | null, decoy: { kind, starts_at } | null }.
export function buildCase({ seed, cause = null, decoy = null, version = WORLD_VERSION, rows } = {}) {
  const world = buildWorld({ seed, version, rows });
  const injected = { cause: inject(world, CAUSES, cause, 'cause'), decoy: inject(world, DECOYS, decoy, 'decoy') };
  // With neither, the case is the baseline world, hash and all.
  world.injection = injected.cause || injected.decoy ? injected : null;
  world.hash = worldHash(world);
  return world;
}

// Store revenue per paid hour, the whole world through: a decoy must leave every hour as it was, hidden days included.
const revenueByHour = world => JSON.stringify(Object.entries(world.orders.reduce((hours, o) => {
  if (o.paid_at !== undefined) hours[Math.floor(o.paid_at / 3600)] = (hours[Math.floor(o.paid_at / 3600)] ?? 0) + o.total_paise;
  return hours;
}, {})));
const dip = m => ({ now: m.now, dip_paise: m.dipPaise, comparison_paise: m.comparisonPaise, crosses: m.crosses });

// The trigger freezes "now" at the first crossing from `from` (default: the cause's start, else the decoy's); a case
// that never crosses fails `no_dip`. Then the same seed is built without the cause, which must not cross at that
// "now", and without the decoy, which must cross first at the same "now" with the same figures and the same store
// revenue in every hour. `build` is replaceable so a test can plant a bad decoy.
export function counterfactualCheck(spec, { rows, from, build = buildCase } = {}) {
  const start = from ?? spec.cause?.starts_at ?? spec.decoy?.starts_at;
  requireThat(Number.isInteger(start), 'counterfactual: a cause, a decoy or `from` gives where the trigger starts');
  const world = build({ ...spec, rows });
  let now;
  try { now = freezeNow(world, start); } catch { return { now: null, failures: ['no_dip'], pass: false }; }
  const result = { now, with_both: dip(measure(world, now)), failures: [] };
  if (spec.cause) {
    result.without_cause = dip(measure(build({ ...spec, cause: null, rows }), now));
    if (result.without_cause.crosses) result.failures.push('no_cause_still_dips');
  }
  if (spec.decoy) {
    const noDecoy = build({ ...spec, decoy: null, rows });
    result.without_decoy = dip(measure(noDecoy, now));
    let first = null;
    try { first = freezeNow(noDecoy, start); } catch { /* it never crosses: the decoy made the dip */ }
    const same = ['dip_paise', 'comparison_paise'].every(k => result.without_decoy[k] === result.with_both[k]);
    if (first !== now || !same) result.failures.push('decoy_moves_dip');
    if (revenueByHour(noDecoy) !== revenueByHour(world)) result.failures.push('decoy_moves_revenue');
  }
  return { ...result, pass: result.failures.length === 0 };
}
