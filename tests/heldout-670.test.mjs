import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { checkHeldout, compareAnswers, acceptReview, withOrderStatuses, checkPins, sha256 } from './evaluator/order-recovery/heldout.mjs';
import { loadTruth, grade } from './evaluator/order-recovery/grade.mjs';
import { runHeldout } from '../scripts/run-heldout.mjs';

const pins = JSON.parse(readFileSync(new URL('../reports/order-recovery/heldout-670.sources.json', import.meta.url)));
function fixture() {
  const world = { id: 'synthetic-test-only', mode: 'SIMULATED', nowMinute: 60, pluginVersion: '4.8.8', payment_action: 'authorize', records: [] };
  const truth = { orders: [] };
  for (let i = 1; i <= 10; i++) {
    const orderId = `o-${i}`, paymentId = `p-${i}`, text = i !== 6;
    world.records.push({ id: orderId, kind: 'order', heldBy: 'merchant', access: 'needs merchant consent (simulated)', status: 'failed' });
    world.records.push({ id: paymentId, kind: 'payment', heldBy: 'razorpay', access: 'simulated', orderId, status: 'authorized', email: `test${i}@example.invalid`, amountMinor: 100, currency: 'INR', items: ['test-item'], createdMinute: 0, deadlineMinute: 100 });
    if (text) world.records.push({ id: `m-${i}`, kind: 'message', heldBy: 'merchant', access: 'needs merchant consent (simulated)', orderId, text: `Synthetic unit test message ${i}.` });
    const close = [2, 4].includes(i);
    const answer = { action: close ? 'close' : 'capture', ...(close ? {} : { fulfillment: 'to_ship' }), evidenceIds: [paymentId, ...(text && ![5, 6].includes(i) ? [`m-${i}`] : [])] };
    truth.orders.push({ orderId, tier: i === 7 ? 'person' : [5, 6].includes(i) ? 'fields' : 'words', story: `Synthetic unit test ${i}.`, answer, expected: { payment: close ? 'refunded' : 'captured', fulfillment: close ? 'closed' : 'to_ship', orderStatus: close ? 'cancelled' : 'processing' } });
  }
  return { world, truth, twins: [['o-1', 'o-2'], ['o-3', 'o-4']], controls: ['o-5', 'o-6'] };
}
const answersFor = draft => draft.truth.orders.map(t => ({ orderId: t.orderId, reason: 'Synthetic evidence-based test reason.', ...(t.tier === 'person' ? { action: 'ask', evidenceIds: t.answer.evidenceIds, question: 'Should this held payment be captured or should we wait?', heldAction: 'capture' } : t.answer) }));
const decisionsFor = draft => answersFor(draft).map(({ orderId, action, fulfillment, evidenceIds }) => ({ orderId, action, ...(fulfillment ? { fulfillment } : {}), evidenceIds }));
function temporary(fn) {
  const folder = mkdtempSync(join(tmpdir(), 'heldout-670-'));
  try { return fn(folder); } finally { rmSync(folder, { recursive: true, force: true }); }
}
const save = (folder, name, value) => writeFileSync(join(folder, name), JSON.stringify(value));

test('frozen sources are checked without importing or running a rival', () => {
  checkPins(pins);
  assert.match(pins['order-recovery/rivals.mjs'], /^a7aabd94/);
  for (const path of Object.keys(pins)) assert.throws(() => checkPins(pins, name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8') + (path === name ? '\nchanged' : '')), /frozen-source/);
  for (const path of ['scripts/run-heldout.mjs', 'tests/evaluator/order-recovery/heldout.mjs']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?:import|from).*rivals/);
  }
});

test('author brief excludes the seen messages and rival code; B1 includes no case file', () => {
  const brief = readFileSync(new URL('../reports/order-recovery/heldout-670-author.md', import.meta.url), 'utf8');
  const seen = JSON.parse(readFileSync(new URL('../order-recovery/worlds/razorpay-670.json', import.meta.url)));
  for (const record of seen.records.filter(r => r.kind === 'message')) assert.ok(!brief.includes(record.text));
  assert.doesNotMatch(brief, /textRules|fieldsThenAsk|wordsScript|razorpay-670\.truth/);
  assert.equal(existsSync(new URL('../order-recovery/worlds/heldout-670.json', import.meta.url)), false);
  assert.equal(existsSync(new URL('./evaluator/order-recovery/heldout-670.truth.json', import.meta.url)), false);
});

test('public B1 commitment contains fixed hashes without exposing cases', () => {
  const bytes = readFileSync(new URL('../reports/order-recovery/heldout-670.commitment.json', import.meta.url));
  assert.equal(sha256(bytes), '4943d26d094649e142771289885a8c57498e2ef28c899e98ed5d0e889ab498c5');
  const manifest = JSON.parse(bytes);
  assert.deepEqual(Object.keys(manifest), ['files']);
  for (const name of ['draft.json', 'world.json', 'truth.json', 'reviewer-answers.json', 'investigation.json', 'comparison.json']) assert.match(manifest.files[name], /^[a-f0-9]{64}$/);
});

test('a synthetic set reaches its floor; loadTruth accepts a separate path', () => temporary(folder => {
  const draft = fixture();
  assert.deepEqual(checkHeldout(draft), { orders: 10, floor: 1 });
  save(folder, 'truth.json', draft.truth);
  assert.deepEqual(loadTruth(join(folder, 'truth.json')), draft.truth);
  assert.equal(grade(draft.world, decisionsFor(draft), draft.truth).reduce((s, r) => s + r.cost, 0), 1);
  const legacy = structuredClone(draft); legacy.truth.orders.forEach(t => { delete t.expected.orderStatus; });
  assert.deepEqual(withOrderStatuses(legacy), draft);
  assert.equal(legacy.truth.orders[0].expected.orderStatus, undefined);
}));

test('answer keys cannot introduce an order identity, including swapped rows', () => {
  const draft = fixture();
  for (const [index, orderId] of [[0, 'o-3'], [2, 'o-1']]) {
    draft.truth.orders[index].answer.orderId = orderId;
    draft.truth.orders[index].answer.evidenceIds = ['p-1', 'm-1', 'p-3', 'm-3'];
  }
  assert.throws(() => checkHeldout(draft), /answer-fields/);
  assert.throws(() => acceptReview(draft, answersFor(fixture()), { unresolved: [], resolutions: [], realism: { accepted: true, reason: 'Synthetic test.' } }), /answer-fields/);
  const redundant = fixture(); redundant.truth.orders[0].answer.orderId = 'o-1';
  assert.throws(() => checkHeldout(redundant), /answer-fields/);
});

test('grading an ask preserves its order identity even with an unchecked legacy key', () => {
  const draft = fixture(), decisions = decisionsFor(draft);
  for (const [index, orderId] of [[0, 'o-3'], [2, 'o-1']]) {
    draft.truth.orders[index].answer.orderId = orderId;
    draft.truth.orders[index].answer.evidenceIds = ['p-1', 'm-1', 'p-3', 'm-3'];
  }
  decisions[0] = { orderId: 'o-1', action: 'ask', evidenceIds: draft.truth.orders[0].answer.evidenceIds };
  const rows = grade(draft.world, decisions, draft.truth);
  assert.deepEqual(rows.map(r => r.orderId), draft.truth.orders.map(t => t.orderId));
  assert.equal(rows[0].reason, 'ask');
  assert.equal(rows.reduce((sum, r) => sum + r.cost, 0), 2);
});

test('twin matching ignores JSON property order while retaining value checks', () => {
  const draft = fixture(), index = draft.world.records.findIndex(r => r.id === 'p-2');
  draft.world.records[index] = Object.fromEntries(Object.entries(draft.world.records[index]).reverse());
  assert.deepEqual(checkHeldout(draft), { orders: 10, floor: 1 });
  const mismatched = structuredClone(draft);
  mismatched.world.records[index].amountMinor += 1;
  assert.throws(() => checkHeldout(mismatched), /twin-fields/);
});

test('bad shapes fail with ids and rule names, never case text', () => {
  const mutations = [
    [d => { d.world.records[0].access = 'invalid'; }, 'world-schema'],
    [d => { d.world.records[0].status = 'completed'; }, 'queue-size'],
    [d => { d.truth.orders.pop(); }, 'truth-coverage'],
    [d => { d.truth.orders[0].tier = 'unknown'; }, 'tier'],
    [d => { d.truth.orders[0].story = ''; }, 'story'],
    [d => { d.truth.orders[0].answer.action = 'ask'; }, 'answer'],
    [d => { d.truth.orders[0].expected.payment = 'authorized'; }, 'expected'],
    [d => { d.truth.orders[0].answer.evidenceIds = []; }, 'deciding-records'],
    [d => { d.truth.orders[0].answer.evidenceIds = ['p-1']; }, 'text-tier'],
    [d => { d.truth.orders[0].answer.fulfillment = 'unknown'; }, 'answer-schema'],
    [d => { d.world.records.find(r => r.id === 'p-1').status = 'captured'; }, 'reachable-answers'],
    [d => { d.truth.orders[0].expected.fulfillment = 'shipped'; }, 'reachable-answers'],
    [d => { d.truth.orders.forEach(t => { if (t.tier === 'person') t.tier = 'words'; }); }, 'tier-spread'],
    [d => { d.controls = ['o-5', 'o-5']; }, 'controls'],
    [d => { d.controls = ['o-5']; }, 'controls'],
    [d => { d.world.records.push({ ...d.world.records.find(r => r.id === 'm-5'), id: 'm-6', orderId: 'o-6' }); }, 'control-text'],
    [d => { d.twins = [['o-1', 'o-2']]; }, 'twin-pairs'],
    [d => { d.twins[1][0] = 'o-1'; }, 'twin-pairs'],
    [d => { d.twins[0][0] = 'missing'; }, 'twin-members'],
    [d => { d.world.records.find(r => r.id === 'p-2').amountMinor += 1; }, 'twin-fields'],
    [d => { d.truth.orders[1] = { ...d.truth.orders[1], answer: { ...d.truth.orders[0].answer, evidenceIds: ['p-2', 'm-2'] }, expected: d.truth.orders[0].expected }; }, 'twin-state'],
    [d => { d.world.records.find(r => r.id === 'm-1').text = JSON.parse(readFileSync(new URL('../order-recovery/worlds/razorpay-670.json', import.meta.url))).records.find(r => r.kind === 'message').text; }, 'copied-message'],
  ];
  for (const [mutate, rule] of mutations) { const draft = fixture(); mutate(draft); assert.throws(() => checkHeldout(draft), new RegExp(`: ${rule}$`)); }
});

test('review disagreement preserves labels and blocks acceptance until evidence-based investigation', () => {
  const draft = fixture(), answers = answersFor(draft);
  answers[0] = { ...answers[0], action: 'leave' }; delete answers[0].fulfillment;
  const result = compareAnswers(draft, answers);
  assert.deepEqual(result.disagreements, ['o-1']);
  assert.equal(draft.truth.orders[0].tier, 'words');
  const investigation = { unresolved: [], realism: { accepted: true, reason: 'Synthetic test.' }, resolutions: [] };
  assert.throws(() => acceptReview(draft, answers, { ...investigation, unresolved: ['o-1'] }), /unresolved-review/);
  assert.throws(() => acceptReview(draft, answers, investigation), /missing-resolution/);
  investigation.resolutions.push({ orderId: 'o-1', rule: 'unopposed-live-hold', reason: 'Synthetic evidence supports original answer.', evidenceIds: ['p-1', 'm-1'], truth: { answer: draft.truth.orders[0].answer } });
  const accepted = acceptReview(draft, answers, investigation);
  assert.equal(accepted.draft.truth.orders[0].tier, 'words');
  assert.match(accepted.draft.truth.orders[6].question, /\?$/);
  investigation.resolutions[0].evidenceIds = ['absent'];
  assert.throws(() => acceptReview(draft, answers, investigation), /resolution-evidence/);
  const vague = answersFor(draft); delete vague[6].question;
  assert.throws(() => compareAnswers(draft, vague), /reviewer-reason/);
});

test('review, comparison and commitment protect the exact reviewed bytes and never overwrite', () => temporary(folder => {
  const draft = fixture(); save(folder, 'draft.json', draft);
  assert.equal(runHeldout('--validate', folder).orders, 10);
  assert.equal(existsSync(join(folder, 'world.json')), false);
  runHeldout('--review', folder);
  const review = readFileSync(join(folder, 'world.json'), 'utf8');
  for (const t of draft.truth.orders) assert.ok(!review.includes(t.story));
  assert.ok(!review.includes('"tier"') && !review.includes('"answer"'));
  assert.throws(() => runHeldout('--review', folder), /review-exists/);
  save(folder, 'reviewer-answers.json', answersFor(draft));
  const investigation = { authorHash: sha256(readFileSync(join(folder, 'draft.json'))), reviewerHash: sha256(readFileSync(join(folder, 'reviewer-answers.json'))), unresolved: [], resolutions: [], realism: { accepted: false, reason: 'Synthetic test.' } };
  save(folder, 'investigation.json', investigation);
  assert.throws(() => runHeldout('--compare', folder), /realism-review/);
  investigation.realism.accepted = true; save(folder, 'investigation.json', investigation);
  runHeldout('--compare', folder);
  assert.throws(() => runHeldout('--compare', folder), /comparison-exists/);
  save(folder, 'attempt-1.json', { raw: 'original attempt' });
  runHeldout('--pin', folder); runHeldout('--check', folder);
  assert.throws(() => runHeldout('--check-public', folder), /public-commitment-changed/);
  const manifest = JSON.parse(readFileSync(join(folder, 'commitment.json')));
  assert.equal(manifest.files['attempt-1.json'], sha256(readFileSync(join(folder, 'attempt-1.json'))));
  assert.throws(() => runHeldout('--pin', folder), /EEXIST/);
  const originalTruth = readFileSync(join(folder, 'truth.json'));
  writeFileSync(join(folder, 'truth.json'), '{}');
  assert.throws(() => runHeldout('--check', folder), /reviewed-files-changed/);
  writeFileSync(join(folder, 'truth.json'), originalTruth);
  writeFileSync(join(folder, 'reviewer-answers.json'), JSON.stringify(answersFor(draft)) + '\n');
  assert.throws(() => runHeldout('--check', folder), /investigation-changed/);
  save(folder, 'reviewer-answers.json', answersFor(draft));
  writeFileSync(join(folder, 'attempt-1.json'), 'changed');
  assert.throws(() => runHeldout('--check', folder), /commitment-changed/);
  writeFileSync(join(folder, 'reviewer-answers.json'), '[]');
  assert.throws(() => runHeldout('--check', folder), /investigation-changed/);
}));

test('CLI refuses malformed JSON without printing it; in-checkout case folders are refused', () => temporary(folder => {
  writeFileSync(join(folder, 'draft.json'), 'SENSITIVE STORY AND INVALID JSON');
  const child = spawnSync(process.execPath, ['scripts/run-heldout.mjs', '--validate', folder], { encoding: 'utf8' });
  assert.equal(child.status, 1); assert.match(child.stderr, /set: unreadable-input/);
  assert.doesNotMatch(child.stderr + child.stdout, /SENSITIVE/);
  assert.throws(() => runHeldout('--validate', process.cwd()), /outside-checkout/);
  assert.throws(() => runHeldout('--score', folder), /usage/);
  writeFileSync(join(folder, '.git'), 'gitdir: another-checkout');
  assert.throws(() => runHeldout('--validate', folder), /outside-checkout/);
}));
