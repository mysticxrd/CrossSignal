import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { check, validateWorld, validateDecisions, queue, paymentFor } from '../../../order-recovery/world.mjs';
import { grade } from './grade.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const messages = (world, id) => world.records.filter(r => r.kind === 'message' && r.orderId === id);
// Schema migration records the author's intended status without reading any rival output.
export function withOrderStatuses(draft) {
  const copy = structuredClone(draft);
  for (const t of copy.truth.orders) t.expected.orderStatus ??= t.answer.action === 'close' ? 'cancelled' : t.answer.action === 'capture' ? (t.answer.fulfillment === 'shipped' ? 'completed' : 'processing') : copy.world.records.find(r => r.id === t.orderId).status;
  return copy;
}
export function checkHeldout({ world, truth, twins, controls }) {
  try { validateWorld(world); } catch { throw new Error('set: world-schema'); }
  const orders = queue(world), ids = orders.map(o => o.id);
  check(orders.length === 10, 'set: queue-size');
  check(Array.isArray(truth?.orders) && truth.orders.length === 10 && ids.every(id => truth.orders.filter(t => t.orderId === id).length === 1), 'set: truth-coverage');
  for (const t of truth.orders) {
    check(['fields', 'words', 'person'].includes(t.tier), `${t.orderId}: tier`);
    check(typeof t.story === 'string' && t.story.trim().length > 0, `${t.orderId}: story`);
    check(t.answer && ['capture', 'close', 'leave'].includes(t.answer.action), `${t.orderId}: answer`);
    check(t.expected && ['captured', 'refunded', 'failed'].includes(t.expected.payment) && ['closed', 'to_ship', 'shipped'].includes(t.expected.fulfillment) && ['failed', 'pending', 'processing', 'completed', 'cancelled'].includes(t.expected.orderStatus), `${t.orderId}: expected`);
    const evidence = t.answer.evidenceIds, local = world.records.filter(r => r.id === t.orderId || r.orderId === t.orderId);
    check(Array.isArray(evidence) && evidence.length > 0 && new Set(evidence).size === evidence.length && evidence.every(id => world.records.some(r => r.id === id)) && evidence.some(id => local.some(r => r.id === id)), `${t.orderId}: deciding-records`);
    check(t.tier === 'fields' || messages(world, t.orderId).some(m => evidence.includes(m.id) && m.text.trim()), `${t.orderId}: text-tier`);
  }
  const answers = truth.orders.map(t => ({ orderId: t.orderId, ...t.answer }));
  try { validateDecisions(world, answers); } catch { throw new Error('set: answer-schema'); }
  const resolved = grade(world, answers, { ...truth, orders: truth.orders.map(t => ({ ...t, tier: 'fields' })) });
  check(resolved.every(r => r.cost === 0 && !r.unneeded && r.deciding), 'set: reachable-answers');
  const oracle = answers.map(d => truth.orders.find(t => t.orderId === d.orderId).tier === 'person' ? { orderId: d.orderId, action: 'ask', evidenceIds: d.evidenceIds } : d);
  check(grade(world, oracle, truth).every(r => r.cost === (r.tier === 'person' ? 1 : 0) && !r.unneeded && r.deciding), 'set: oracle-floor');
  check(truth.orders.filter(t => t.tier === 'words').length >= 3 && truth.orders.some(t => t.tier === 'person'), 'set: tier-spread');
  check(Array.isArray(controls) && new Set(controls).size === controls.length && controls.length >= 2 && controls.every(id => ids.includes(id) && truth.orders.find(t => t.orderId === id).tier === 'fields'), 'set: controls');
  check(controls.some(id => messages(world, id).length) && controls.some(id => !messages(world, id).length), 'set: control-text');
  check(Array.isArray(twins) && twins.length >= 2 && twins.every(p => Array.isArray(p) && p.length === 2) && new Set(twins.flat()).size === twins.length * 2, 'set: twin-pairs');
  for (const pair of twins) {
    check(pair.every(id => ids.includes(id) && messages(world, id).some(m => m.text.trim()) && truth.orders.find(t => t.orderId === id).tier !== 'fields'), 'set: twin-members');
    const payments = pair.map(id => Object.fromEntries(Object.entries(paymentFor(world, id)).filter(([k]) => !['id', 'orderId', 'email'].includes(k))));
    check(same(payments[0], payments[1]) && world.records.find(r => r.id === pair[0]).status === world.records.find(r => r.id === pair[1]).status, 'set: twin-fields');
    const states = pair.map(id => truth.orders.find(t => t.orderId === id).expected);
    check(['payment', 'fulfillment', 'orderStatus'].some(k => states[0][k] !== states[1][k]), 'set: twin-state');
  }
  const seen = JSON.parse(readFileSync(new URL('../../../order-recovery/worlds/razorpay-670.json', import.meta.url), 'utf8')).records.filter(r => r.kind === 'message').map(r => r.text.trim().toLowerCase());
  check(world.records.filter(r => r.kind === 'message').every(r => r.text.trim() && !seen.includes(r.text.trim().toLowerCase())), 'set: copied-message');
  return { orders: orders.length, floor: truth.orders.filter(t => t.tier === 'person').length };
}

// Disagreement opens an investigation; it never assigns a person tier.
export function compareAnswers(draft, answers) {
  checkHeldout(draft);
  try { validateDecisions(draft.world, answers.map(({ orderId, action, fulfillment, evidenceIds }) => ({ orderId, action, ...(fulfillment ? { fulfillment } : {}), evidenceIds }))); } catch { throw new Error('set: reviewer-answer-schema'); }
  check(answers.every(d => d.reason?.trim() && d.evidenceIds.length && (d.action !== 'ask' || validQuestion(d))), 'set: reviewer-reason');
  const disagreements = draft.truth.orders.filter(t => {
    const d = answers.find(d => d.orderId === t.orderId);
    return d.action !== (t.tier === 'person' ? 'ask' : t.answer.action) || (d.action === 'capture' && d.fulfillment !== t.answer.fulfillment) || !same([...new Set(d.evidenceIds)].sort(), [...t.answer.evidenceIds].sort());
  }).map(t => t.orderId);
  return { disagreements };
}
const validQuestion = row => typeof row.question === 'string' && row.question.trim().length >= 12 && (row.question.match(/\?/g) || []).length === 1 && row.question.trim().endsWith('?') && ['capture', 'close'].includes(row.heldAction);
export function acceptReview(draft, answers, investigation) {
  const { disagreements } = compareAnswers(draft, answers), resolutions = investigation.resolutions;
  check(Array.isArray(investigation.unresolved) && !investigation.unresolved.length, 'set: unresolved-review');
  check(investigation.realism?.accepted === true && investigation.realism.reason?.trim(), 'set: realism-review');
  check(Array.isArray(resolutions) && new Set(resolutions.map(r => r.orderId)).size === resolutions.length && disagreements.every(id => resolutions.some(r => r.orderId === id)), 'set: missing-resolution');
  const adjusted = structuredClone(draft);
  for (const r of resolutions) {
    const t = adjusted.truth.orders.find(t => t.orderId === r.orderId);
    check(t && r.rule?.trim() && r.reason?.trim() && Array.isArray(r.evidenceIds) && r.evidenceIds.length && r.evidenceIds.every(id => draft.world.records.some(rec => rec.id === id)), 'set: resolution-evidence');
    check(r.truth && Object.keys(r.truth).every(k => ['tier', 'answer', 'expected', 'question', 'heldAction'].includes(k)), 'set: resolution-fields');
    Object.assign(t, r.truth);
  }
  for (const t of adjusted.truth.orders.filter(t => t.tier === 'person')) {
    const d = answers.find(d => d.orderId === t.orderId);
    if (!t.question && d.action === 'ask') { t.question = d.question; t.heldAction = d.heldAction; }
    check(validQuestion(t), 'set: person-question');
  }
  checkHeldout(adjusted);
  return { draft: adjusted, disagreements, corrected: resolutions.map(r => r.orderId) };
}

export function checkPins(pins, read = path => readFileSync(new URL(`../../../${path}`, import.meta.url))) {
  for (const [path, hash] of Object.entries(pins)) check(sha256(read(path)) === hash, 'set: frozen-source');
}
